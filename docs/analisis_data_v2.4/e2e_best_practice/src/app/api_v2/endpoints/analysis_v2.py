# UPDATED v2.4 - INDIKATOR SINKRONISASI
import json
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.celery_app import celery_app
from app.core.database import get_db
from app.db.redis import redis_client
from app.models.mikrotik import (
    BoardInterfaceConfig,
    MikrotikBoard,
    MasterSite,
)
from app.models.user import MasterUser
from app.schemas.mikrotik import (
    AggregateAllItem,
    AggregateAllResponse,
    AnalysisResponse,
    AsyncAnalysisResponse,
    InterfaceListItem,
    ScopedAnalysisResponse,
    SiteGroupSummaryResponse,
    TaskStatusResponse,
    TimeDensityItem,
    TopAnalysisItem,
    UserListItem,
)
from app.services import analysis_service, normalization_v2
from app.services.analysis_service import PIPELINE_EXECUTION_COUNT
from app.tasks.pipeline_tasks import execute_full_pipeline_v21_task

logger = logging.getLogger(__name__)

router = APIRouter()

CACHE_PREFIX_ANALYSIS_V21 = "analysis_v21_v2_4"


def _normalize_to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _should_use_cache(start_time: datetime, end_time: datetime, granularity: str) -> bool:
    delta = end_time - start_time
    if granularity == "hour":
        return delta <= timedelta(days=7)
    if granularity == "day":
        return delta <= timedelta(days=365)
    if granularity == "month":
        return delta <= timedelta(days=3650)
    return True


def _build_analysis_cache_key(
    board_id: UUID,
    interface_name: Optional[str],
    start_time: datetime,
    end_time: datetime,
    granularity: str,
) -> str:
    iface = interface_name or "all"
    return (
        f"{CACHE_PREFIX_ANALYSIS_V21}:"
        f"{board_id}:{iface}:"
        f"{start_time.isoformat()}:{end_time.isoformat()}:{granularity}"
    )


def _format_top_usage(
    rows: List[Dict[str, Any]],
    q: Optional[str],
    unit: str,
) -> List[Dict[str, Any]]:
    nf = (q or "").lower()
    data: List[Dict[str, Any]] = []
    for r in rows:
        name = (
            r.get("username")
            or r.get("pppoe_username")
            or r.get("hotspot_username")
            or r.get("name")
            or "Unknown"
        )
        if nf and nf not in str(name).lower():
            continue
        dl = float(r.get("download_value") or r.get("dl") or 0)
        ul = float(r.get("upload_value") or r.get("ul") or 0)
        total = dl + ul
        data.append(
            {
                "name": name,
                "download_value": dl,
                "upload_value": ul,
                "total_value": total,
                "unit": unit,
            }
        )
    data.sort(key=lambda x: x["total_value"], reverse=True)
    return data


@router.get("/{board_id}/pipeline-v21/", response_model=AnalysisResponse)
async def execute_pipeline_v21(
    board_id: UUID,
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    granularity: str = Query("hour", pattern="^(auto|hour|day|month|year)$"),
    interface_name: Optional[str] = Query(None, alias="interfaceName"),  # V2.4.1: Add interfaceName
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Main Pipeline Backend V2.1.
    Menjalankan Stage 1 (Lock) -> Stage 2 (Trend) -> ... -> Stage 7 (Insight).
    """
    start_time = _normalize_to_utc(start_time)
    end_time = _normalize_to_utc(end_time)

    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )

    cache_key: Optional[str] = None
    use_cache = _should_use_cache(start_time, end_time, granularity)
    if use_cache:
        cache_key = _build_analysis_cache_key(
            board_id, interface_name, start_time, end_time, granularity
        )
        cached_res = await redis_client.get(cache_key)
        if cached_res:
            logger.info(
                f"Returning cached analysis for board {board_id}, interface {interface_name}"
            )
            try:
                return AnalysisResponse.model_validate(json.loads(cached_res))
            except Exception as e:
                logger.warning(f"Cache validation error: {e}")
    try:
        # STAGE 0: Normalization (MANDATORY in V2.4)
        # Ensure data is normalized before analysis
        # In V2.4, we pass the normalized data directly to Stage 1
        normalized_data = await normalization_v2.run_normalization_preview(
            db=db,
            board_id=board_id,
            start_time=start_time,
            end_time=end_time,
            granularity=granularity,
            fill_gaps=True,
            interface_name=interface_name,  # V2.4.1: Pass interface_name
        )

        # Check accuracy/quality from Stage 0 (adapted to V2.4.2 normalization output)
        metadata = normalized_data.get("metadata") or {}
        traffic_meta = metadata.get("traffic") or {}
        resource_meta = metadata.get("resource") or {}

        traffic_acc = traffic_meta.get("valid_count", 0) > 0
        resource_acc = resource_meta.get("valid_count", 0) > 0

        if not traffic_acc and not resource_acc:
            logger.warning(
                f"No valid data found for board {board_id} (interface: {interface_name}) in range {start_time} - {end_time}"
            )
            # We still proceed but results might be empty

        # STAGE 1: Context Lock (V2.4: Using Normalized Data)
        temp_table = await analysis_service.create_scoped_dataset(
            db=db,
            board_id=board_id,
            start_time=start_time,
            end_time=end_time,
            granularity=granularity,
            normalized_source=normalized_data,  # V2.4: Pass normalized data
            interface_name=interface_name,  # V2.4.1: Pass interface_name
        )

        try:
            # STAGE 2: Trend & Aggregation
            trend_data = await analysis_service.get_trend_analysis(
                db=db, temp_table=temp_table
            )

            # STAGE 3-5: Analytics (Correlation, Habit, Anomaly)
            analytics_data = await analysis_service.get_advanced_analytics(
                db=db, temp_table=temp_table
            )

            # STAGE 6: Health Score
            health_score = await analysis_service.calculate_health_score(
                trend_data=trend_data, analytics_data=analytics_data
            )

            # STAGE 7: Insights
            insights = await analysis_service.generate_insights(
                trend_data=trend_data,
                analytics_data=analytics_data,
                health_score=health_score,
            )

            res_payload = {
                "status": "success",
                "metadata": {
                    "board_id": board_id,
                    "interface_name": interface_name,  # V2.4.1: Return interface_name
                    "range": {"start": start_time, "end": end_time},
                    "granularity": granularity,
                    "temp_table": temp_table,
                    "cached": False,
                    "processed_at": datetime.now(),
                },
                "stages": {
                    "stage1_lock": "completed",
                    "stage2_trend": "completed",
                    "stage3_5_analytics": "completed",
                    "stage6_scoring": "completed",
                    "stage7_insight": "completed",
                },
                "results": {
                    "trend": trend_data,
                    "analytics": analytics_data,
                    "health_score": health_score,
                    "insights": insights,
                },
            }

            # Validate payload before returning and caching
            validated_payload = AnalysisResponse.model_validate(res_payload)

            if cache_key:
                try:
                    cache_payload = validated_payload.model_dump(by_alias=True)
                    cache_payload["metadata"]["cached"] = True
                    await redis_client.setex(
                        cache_key, 3600, json.dumps(jsonable_encoder(cache_payload))
                    )
                except Exception as ce:
                    logger.warning(f"Failed to cache analysis: {ce}")

            # UPDATE 2.4.1: Use jsonable_encoder with by_alias=True for explicit camelCase output
            PIPELINE_EXECUTION_COUNT.labels(status="success").inc()
            return jsonable_encoder(validated_payload, by_alias=True)
        finally:
            logger.info(f"Cleaning up temporary table {temp_table}")
            try:
                safe_temp = analysis_service.ensure_safe_temp_table_name(temp_table)
                await db.execute(text(f"DROP TABLE IF EXISTS {safe_temp}"))
            except Exception as ce:
                logger.warning(f"Failed to drop temp table {temp_table}: {ce}")
            await db.commit()

    except Exception as e:
        PIPELINE_EXECUTION_COUNT.labels(status="error").inc()
        logger.error(f"Error in pipeline-v21: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@router.post("/{board_id}/pipeline-v21/async/", response_model=AsyncAnalysisResponse)
async def execute_pipeline_v21_async(
    board_id: UUID,
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    granularity: str = Query("hour", pattern="^(auto|hour|day|month|year)$"),
    interface_name: Optional[str] = Query(None, alias="interfaceName"),  # V2.4.1: Add interfaceName
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Menjalankan Full Pipeline V2.1 secara asinkron via Celery.
    Mengembalikan task_id untuk tracking status.
    """
    start_time = _normalize_to_utc(start_time)
    end_time = _normalize_to_utc(end_time)

    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )

    task = execute_full_pipeline_v21_task.delay(
        str(board_id), 
        start_time.isoformat(), 
        end_time.isoformat(), 
        granularity,
        interface_name,  # V2.4.1: Pass interface_name
    )

    return {
        "status": "queued",
        "taskId": task.id,
        "boardId": board_id,
        "interfaceName": interface_name,  # V2.4.1: Return interfaceName
        "range": {"start": start_time, "end": end_time},
    }


@router.get("/tasks/{task_id}/status/", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Mengecek status task Celery berdasarkan task_id.
    """
    res = celery_app.AsyncResult(task_id)
    state = res.state

    response = {
        "status": "success",
        "taskId": task_id,
        "state": state,
        "progress": 0.0,
        "currentStage": "",
    }

    if state == "PROGRESS":
        # Progress info is in res.info or res.result depending on Celery version/config
        # but typically update_state stores it in res.info
        info = res.info
        if isinstance(info, dict):
            response["progress"] = info.get("progress", 0.0)
            response["currentStage"] = info.get("stage", "")
    elif state == "SUCCESS":
        raw_result = res.result
        normalized_result = None

        if isinstance(raw_result, dict):
            try:
                raw_metadata = raw_result.get("metadata") or {}
                raw_results = raw_result.get("results") or {}

                res_payload = {
                    "status": raw_result.get("status", "success"),
                    "metadata": {
                        "board_id": raw_result.get("board_id"),
                        "interface_name": raw_metadata.get("interface_name"),
                        "range": raw_metadata.get("range"),
                        "granularity": raw_metadata.get("granularity"),
                        "temp_table": raw_metadata.get("temp_table"),
                        "cached": False,
                        "processed_at": datetime.now(),
                    },
                    "stages": {
                        "stage1_lock": "completed",
                        "stage2_trend": "completed",
                        "stage3_5_analytics": "completed",
                        "stage6_scoring": "completed",
                        "stage7_insight": "completed",
                    },
                    "results": {
                        "trend": raw_results.get("trend"),
                        "analytics": raw_results.get("analytics"),
                        "health_score": raw_results.get("health_score")
                        or raw_results.get("healthScore"),
                        "insights": raw_results.get("insights"),
                    },
                }

                validated = AnalysisResponse.model_validate(res_payload)
                normalized_result = jsonable_encoder(validated, by_alias=True)
            except Exception as e:
                logger.warning(
                    f"Failed to normalize async result for task {task_id}: {e}"
                )

        response["result"] = normalized_result or raw_result
        response["progress"] = 100.0
        response["currentStage"] = "Completed"
    elif state == "FAILURE":
        response["error"] = str(res.result)

    return response


@router.get("/{board_id}/scoped-analysis/", response_model=ScopedAnalysisResponse)
async def get_scoped_analysis(
    board_id: UUID,
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    granularity: str = Query("hour", pattern="^(auto|hour|day|month|year)$"),
    interface_name: Optional[str] = Query(None, alias="interfaceName"),  # V2.4.1: Add interfaceName
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Endpoint Stage 1: Context Lock.
    Mengunci dataset ke dalam Temporary Table untuk analisis konsisten (Stage 2-7).
    """
    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )

    try:
        # 1. Pastikan data sudah dinormalisasi (Stage 0)

        # 2. Create Scoped Dataset (Stage 1)
        temp_table = await analysis_service.create_scoped_dataset(
            db=db,
            board_id=board_id,
            start_time=start_time,
            end_time=end_time,
            granularity=granularity,
            interface_name=interface_name,  # V2.4.1: Pass interface_name
        )

        # 3. Ambil data dari temporary table untuk verifikasi/preview awal
        query = text(f"SELECT * FROM {temp_table} LIMIT 100")
        res = await db.execute(query)
        rows = res.fetchall()

        data = []
        for r in rows:
            data.append(
                {
                    "period": r[0].isoformat() if r[0] else None,
                    "rx": float(r[1] or 0),
                    "tx": float(r[2] or 0),
                    "acc_traffic": float(r[3] or 100),
                    "cpu": float(r[4] or 0),
                    "mem": float(r[5] or 0),
                    "acc_resource": float(r[6] or 100),
                }
            )

        return {
            "status": "locked",
            "context": {
                "board_id": board_id,
                "interface_name": interface_name,  # V2.4.1: Return interface_name
                "temp_table": temp_table,
                "range": {"start": start_time, "end": end_time},
                "granularity": granularity,
            },
            "preview": data,
        }
    except Exception as e:
        logger.error(f"Error in scoped-analysis: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Gagal membuat context lock: {str(e)}"
        )


@router.get(
    "/{board_id}/aggregate-all/",
    response_model=Union[List[AggregateAllItem], AggregateAllResponse],
)
async def aggregate_all(
    board_id: UUID,
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    granularity: str = Query("auto", pattern="^(auto|year|month|day|hour)$"),
    agg: str = Query("avg", pattern="^(sum|avg|min|max)$"),
    interface: Optional[List[str]] = Query(
        None, description="Daftar interface untuk multi-entity"
    ),
    pppoe: Optional[List[str]] = Query(
        None, description="Daftar username PPPoE untuk multi-entity"
    ),
    hotspot: Optional[List[str]] = Query(
        None, description="Daftar username Hotspot untuk multi-entity"
    ),
    combine: str = Query("total", pattern="^(total|per_entity|both)$"),
    fill_gap: str = Query("zero", pattern="^(zero|null)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Mengambil bucket waktu teragregasi lintas metrik sekaligus (summary-based).
    Menghasilkan baris per periode:
      { period, downloadMbps, uploadMbps, cpuPercentStandard, freeMemory }
    """
    start_time = _normalize_to_utc(start_time)
    end_time = _normalize_to_utc(end_time)
    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )

    # Jika multi-entity via interface[] diminta
    if interface and len(interface) > 0:
        # Paksa granularity minimum 'day' jika bukan hour/day/month/year yang valid
        g = granularity if granularity in ["hour", "day", "month", "year"] else "day"
        # Bangun placeholder IN (:i0,:i1,...) agar tetap ter-parameter
        ph_list = []
        params: Dict[str, Any] = {
            "granularity": g,
            "board_id": str(board_id),
            "start_time": start_time,
            "end_time": end_time,
        }
        for idx, name in enumerate(interface):
            key = f"i{idx}"
            ph_list.append(f":{key}")
            params[key] = name
        in_clause = ", ".join(ph_list) if ph_list else "NULL"
        try:
            if combine == "total":
                q_total = text(f"""
                    SELECT
                      date_trunc(:granularity, log_time) AS period,
                      {agg}(download_mbps) AS dl_val,
                      {agg}(upload_mbps) AS ul_val
                    FROM board_speed_stats
                    WHERE board_id = :board_id
                      AND interface_name IN ({in_clause})
                      AND log_time >= :start_time
                      AND log_time < :end_time
                    GROUP BY period
                    ORDER BY period ASC
                """)
                res = await db.execute(q_total, params)
                rows = res.fetchall()
                result = []
                for r in rows:
                    period_val = r[0]
                    try:
                        period_str = period_val.isoformat()
                    except Exception:
                        period_str = str(period_val)
                    result.append(
                        {
                            "period": period_str,
                            "download_mbps": float(r[1] or 0),
                            "upload_mbps": float(r[2] or 0),
                            "cpu_percent_standard": None,
                            "free_memory": None,
                        }
                    )
                return result
            else:
                # per_entity atau both
                q_by_iface = text(f"""
                    SELECT
                      date_trunc(:granularity, log_time) AS period,
                      interface_name,
                      {agg}(download_mbps) AS dl_val,
                      {agg}(upload_mbps) AS ul_val
                    FROM board_speed_stats
                    WHERE board_id = :board_id
                      AND interface_name IN ({in_clause})
                      AND log_time >= :start_time
                      AND log_time < :end_time
                    GROUP BY period, interface_name
                    ORDER BY period ASC
                """)
                res = await db.execute(q_by_iface, params)
                rows = res.fetchall()
                # Organize per interface
                by_iface: Dict[str, Dict[str, Dict[str, float]]] = {}
                for r in rows:
                    period_val, iface_name, dl, ul = (
                        r[0],
                        r[1],
                        float(r[2] or 0),
                        float(r[3] or 0),
                    )
                    try:
                        p_str = period_val.isoformat()
                    except Exception:
                        p_str = str(period_val)
                    if iface_name not in by_iface:
                        by_iface[iface_name] = {}
                    by_iface[iface_name][p_str] = {
                        "download_mbps": dl,
                        "upload_mbps": ul,
                    }
                series = []
                total_map: Dict[str, Dict[str, float]] = {}
                for iface_name, pmap in by_iface.items():
                    # Build series for this iface
                    periods = sorted(pmap.keys())
                    s_rows = []
                    for p in periods:
                        rec = pmap[p]
                        dl = float(rec.get("download_mbps") or 0)
                        ul = float(rec.get("upload_mbps") or 0)
                        s_rows.append(
                            {
                                "period": p,
                                "download_mbps": dl,
                                "upload_mbps": ul,
                                "cpu_percent_standard": None,
                                "free_memory": None,
                            }
                        )
                        # accumulate to total_map
                        t = total_map.get(p) or {"dl": 0.0, "ul": 0.0}
                        t["dl"] += dl
                        t["ul"] += ul
                        total_map[p] = t
                    series.append(
                        {
                            "key": f"interface:{iface_name}",
                            "label": iface_name,
                            "series": s_rows,
                        }
                    )
                resp: Dict[str, Any] = {
                    "meta": {
                        "granularity": g,
                        "combine": combine,
                        "entity": "interface",
                    },
                    "series_by_entity": series,
                }
                if combine == "both":
                    total_rows = []
                    for p in sorted(total_map.keys()):
                        total_rows.append(
                            {
                                "period": p,
                                "download_mbps": float(total_map[p]["dl"] or 0),
                                "upload_mbps": float(total_map[p]["ul"] or 0),
                                "cpu_percent_standard": None,
                                "free_memory": None,
                            }
                        )
                    resp["total"] = total_rows
                return resp
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Gagal menghitung multi-entity interface: {str(e)}",
            )

    # Untuk pppoe[] dan hotspot[] belum didukung (konversi bytes→Mbps rumit di server)
    if (pppoe and len(pppoe) > 0) or (hotspot and len(hotspot) > 0):
        raise HTTPException(
            status_code=501,
            detail="multi-entity pppoe/hotspot belum didukung pada endpoint ini",
        )

    cache_key = f"v2:aggregate_all:{board_id}:{agg}:{granularity}:{start_time.isoformat()}:{end_time.isoformat()}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    try:
        metrics = [
            "download_mbps",
            "upload_mbps",
            "cpu_load",
            "free_memory",
            "total_active",
        ]
        results: Dict[str, List[Dict[str, Any]]] = {}
        tasks = [
            analysis_service.time_aggregate(
                db=db,
                board_id=board_id,
                metric=m,
                agg=agg,
                start_time=start_time,
                end_time=end_time,
                granularity=granularity,
            )
            for m in metrics
        ]
        agg_results = await asyncio.gather(*tasks)
        for metric_name, rows in zip(metrics, agg_results):
            results[metric_name] = rows

        # Merge berdasarkan 'period'
        def to_map(arr: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
            m: Dict[str, Dict[str, Any]] = {}
            for it in arr or []:
                p = it.get("period")
                if not p:
                    continue
                if p not in m:
                    m[p] = {"period": p}
                m[p]["value"] = it.get("value")
            return m

        dl_map = to_map(results.get("download_mbps", []))
        ul_map = to_map(results.get("upload_mbps", []))
        cpu_map = to_map(results.get("cpu_load", []))
        free_map = to_map(results.get("free_memory", []))
        clients_map = to_map(results.get("total_active", []))

        # Kumpulkan semua kunci periode
        keys = sorted(
            set(
                list(dl_map.keys())
                + list(ul_map.keys())
                + list(cpu_map.keys())
                + list(free_map.keys())
            )
        )
        merged: List[Dict[str, Any]] = []
        for k in keys:
            merged.append(
                {
                    "period": k,
                    "download_mbps": float(dl_map.get(k, {}).get("value") or 0),
                    "upload_mbps": float(ul_map.get(k, {}).get("value") or 0),
                    "cpu_percent_standard": float(
                        cpu_map.get(k, {}).get("value") or 0
                    ),
                    "free_memory": float(free_map.get(k, {}).get("value") or 0),
                    "active_users": int(clients_map.get(k, {}).get("value") or 0),
                }
            )

        max_points = 100000
        if len(merged) > max_points:
            step = max(1, len(merged) // max_points)
            merged = merged[::step]

        # TTL dinamis sesuai granularitas
        ttl = 1800  # 30 menit default
        g = granularity
        if g == "auto":
            # Ambil granularity efektif dari salah satu hasil (download)
            if results.get("download_mbps"):
                g = results["download_mbps"][0].get("granularity", "day")
            else:
                g = "day"
        if g == "hour":
            ttl = 300
        elif g == "day":
            ttl = 1800
        elif g in ("month", "year"):
            ttl = 86400

        try:
            await redis_client.setex(
                cache_key, ttl, json.dumps(jsonable_encoder(merged))
            )
        except Exception:
            pass
        return merged
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/site-groups/aggregate-all/", response_model=List[AggregateAllItem])
async def aggregate_all_site_groups(
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    site_group: List[str] = Query(..., alias="siteGroup"),
    granularity: str = Query("auto", pattern="^(auto|year|month|day|hour)$"),
    agg: str = Query("avg", pattern="^(sum|avg|min|max)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )
    g = granularity if granularity in ["hour", "day", "month", "year"] else "day"
    if not site_group or len(site_group) == 0:
        raise HTTPException(status_code=400, detail="siteGroup wajib diisi")
    ph_list = []
    params: Dict[str, Any] = {
        "granularity": g,
        "start_time": start_time,
        "end_time": end_time,
    }
    for idx, sg in enumerate(site_group):
        key = f"g{idx}"
        ph_list.append(f":{key}")
        params[key] = sg
    in_clause = ", ".join(ph_list)
    try:
        q_dl = text(f"""
            SELECT
              date_trunc(:granularity, s.log_time) AS period,
              {agg}(s.download_mbps) AS val
            FROM board_speed_stats s
            JOIN mikrotik_boards b ON b.board_id = s.board_id
            JOIN master_sites ms ON ms.site_id = b.site_id
            WHERE ms.site_name IN ({in_clause})
              AND s.log_time >= :start_time
              AND s.log_time < :end_time
            GROUP BY period
            ORDER BY period ASC
                """)
        q_ul = text(f"""
            SELECT
              date_trunc(:granularity, s.log_time) AS period,
              {agg}(s.upload_mbps) AS val
            FROM board_speed_stats s
            JOIN mikrotik_boards b ON b.board_id = s.board_id
            JOIN master_sites ms ON ms.site_id = b.site_id
            WHERE ms.site_name IN ({in_clause})
              AND s.log_time >= :start_time
              AND s.log_time < :end_time
            GROUP BY period
            ORDER BY period ASC
                """)
        q_cpu = text(f"""
            SELECT
              date_trunc(:granularity, r.log_time) AS period,
              {agg}(r.cpu_load) AS val
            FROM board_resource_stats r
            JOIN mikrotik_boards b ON b.board_id = r.board_id
            JOIN master_sites ms ON ms.site_id = b.site_id
            WHERE ms.site_name IN ({in_clause})
              AND r.log_time >= :start_time
              AND r.log_time < :end_time
            GROUP BY period
            ORDER BY period ASC
                """)
        q_free = text(f"""
            SELECT
              date_trunc(:granularity, r.log_time) AS period,
              {agg}(r.free_memory) AS val
            FROM board_resource_stats r
            JOIN mikrotik_boards b ON b.board_id = r.board_id
            JOIN master_sites ms ON ms.site_id = b.site_id
            WHERE ms.site_name IN ({in_clause})
              AND r.log_time >= :start_time
              AND r.log_time < :end_time
            GROUP BY period
            ORDER BY period ASC
                """)
        dl_rows = (await db.execute(q_dl, params)).fetchall()
        ul_rows = (await db.execute(q_ul, params)).fetchall()
        cpu_rows = (await db.execute(q_cpu, params)).fetchall()
        free_rows = (await db.execute(q_free, params)).fetchall()

        def to_map(rows_local):
            m: Dict[str, Any] = {}
            for r in rows_local:
                p = r[0]
                try:
                    k = p.isoformat()
                except Exception:
                    k = str(p)
                m[k] = r[1]
            return m

        dl_map = to_map(dl_rows)
        ul_map = to_map(ul_rows)
        cpu_map = to_map(cpu_rows)
        free_map = to_map(free_rows)
        keys = sorted(
            set(
                list(dl_map.keys())
                + list(ul_map.keys())
                + list(cpu_map.keys())
                + list(free_map.keys())
            )
        )
        merged = []
        for k in keys:
            merged.append(
                {
                    "period": k,
                    "download_mbps": float(dl_map.get(k) or 0),
                    "upload_mbps": float(ul_map.get(k) or 0),
                    "cpu_percent_standard": float(cpu_map.get(k) or 0),
                    "free_memory": float(free_map.get(k) or 0),
                }
            )
        return merged
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal menghitung aggregate-all site_group: {str(e)}",
        )


@router.get("/{board_id}/time-density/", response_model=List[TimeDensityItem])
async def time_density(
    board_id: UUID,
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    granularity: str = Query("day", pattern="^(hour|day|month|year)$"),
    entity: str = Query(
        "board", pattern="^(board|interface|pppoe|hotspot|clients|cpu)$"
    ),
    interface: Optional[List[str]] = Query(None),
    pppoe: Optional[List[str]] = Query(None),
    hotspot: Optional[List[str]] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Menghitung kepadatan (jumlah baris) per periode waktu untuk kebutuhan timeline.
    """
    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )

    g = granularity if granularity in ("hour", "day", "month", "year") else "day"

    try:
        if entity == "interface":
            ph_list = []
            params: Dict[str, Any] = {
                "granularity": g,
                "board_id": str(board_id),
                "start_time": start_time,
                "end_time": end_time,
            }
            if interface and len(interface) > 0:
                for idx, name in enumerate(interface):
                    key = f"i{idx}"
                    ph_list.append(f":{key}")
                    params[key] = name
                in_clause = ", ".join(ph_list)
                extra_filter = f"AND interface_name IN ({in_clause})"
            else:
                extra_filter = ""
            q = text(f"""
                SELECT
                  date_trunc(:granularity, log_time) AS period,
                  count(*)::int AS cnt
                FROM board_speed_stats
                WHERE board_id = :board_id
                  AND log_time >= :start_time
                  AND log_time < :end_time
                  {extra_filter}
                GROUP BY period
                ORDER BY period ASC
            """)
            res = await db.execute(q, params)
            rows = res.fetchall()
            out = []
            for r in rows:
                p = r[0]
                try:
                    p_str = p.isoformat()
                except Exception:
                    p_str = str(p)
                out.append({"period": p_str, "count": int(r[1] or 0)})
            return out
        elif entity == "pppoe":
            # log_date bertipe DATE, gunakan date_trunc pada cast ke timestamp
            ph_list = []
            params: Dict[str, Any] = {
                "granularity": g if g in ("day", "month", "year") else "day",
                "board_id": str(board_id),
                "start_date": start_time.date(),
                "end_date": end_time.date(),
            }
            if pppoe and len(pppoe) > 0:
                for idx, name in enumerate(pppoe):
                    key = f"u{idx}"
                    ph_list.append(f":{key}")
                    params[key] = name
                in_clause = ", ".join(ph_list)
                extra_filter = f"AND pppoe_username IN ({in_clause})"
            else:
                extra_filter = ""
            q = text(f"""
                SELECT
                  date_trunc(:granularity, log_date::timestamp) AS period,
                  count(*)::int AS cnt
                FROM board_pppoe_usage
                WHERE board_id = :board_id
                  AND log_date >= :start_date
                  AND log_date <= :end_date
                  {extra_filter}
                GROUP BY period
                ORDER BY period ASC
            """)
            res = await db.execute(q, params)
            rows = res.fetchall()
            out = []
            for r in rows:
                p = r[0]
                try:
                    p_str = p.isoformat()
                except Exception:
                    p_str = str(p)
                out.append({"period": p_str, "count": int(r[1] or 0)})
            return out
        elif entity == "hotspot":
            ph_list = []
            params: Dict[str, Any] = {
                "granularity": g if g in ("day", "month", "year") else "day",
                "board_id": str(board_id),
                "start_date": start_time.date(),
                "end_date": end_time.date(),
            }
            if hotspot and len(hotspot) > 0:
                for idx, name in enumerate(hotspot):
                    key = f"h{idx}"
                    ph_list.append(f":{key}")
                    params[key] = name
                in_clause = ", ".join(ph_list)
                extra_filter = f"AND username IN ({in_clause})"
            else:
                extra_filter = ""
            q = text(f"""
                SELECT
                  date_trunc(:granularity, log_date::timestamp) AS period,
                  count(*)::int AS cnt
                FROM hotspot_usage_raw
                WHERE board_id = :board_id
                  AND log_date >= :start_date
                  AND log_date <= :end_date
                  {extra_filter}
                GROUP BY period
                ORDER BY period ASC
            """)
            res = await db.execute(q, params)
            rows = res.fetchall()
            out = []
            for r in rows:
                p = r[0]
                try:
                    p_str = p.isoformat()
                except Exception:
                    p_str = str(p)
                out.append({"period": p_str, "count": int(r[1] or 0)})
            return out
        elif entity == "clients":
            # board_client_stats: log_time timestamp
            q = text("""
                SELECT
                  date_trunc(:granularity, log_time) AS period,
                  count(*)::int AS cnt
                FROM board_client_stats
                WHERE board_id = :board_id
                  AND log_time >= :start_time
                  AND log_time < :end_time
                GROUP BY period
                ORDER BY period ASC
            """)
            res = await db.execute(
                q,
                {
                    "granularity": g,
                    "board_id": str(board_id),
                    "start_time": start_time,
                    "end_time": end_time,
                },
            )
            rows = res.fetchall()
            out = []
            for r in rows:
                p = r[0]
                try:
                    p_str = p.isoformat()
                except Exception:
                    p_str = str(p)
                out.append({"period": p_str, "count": int(r[1] or 0)})
            return out
        elif entity == "cpu":
            # board_resource_stats: log_time timestamp
            q = text("""
                SELECT
                  date_trunc(:granularity, log_time) AS period,
                  count(*)::int AS cnt
                FROM board_resource_stats
                WHERE board_id = :board_id
                  AND log_time >= :start_time
                  AND log_time < :end_time
                GROUP BY period
                ORDER BY period ASC
            """)
            res = await db.execute(
                q,
                {
                    "granularity": g,
                    "board_id": str(board_id),
                    "start_time": start_time,
                    "end_time": end_time,
                },
            )
            rows = res.fetchall()
            out = []
            for r in rows:
                p = r[0]
                try:
                    p_str = p.isoformat()
                except Exception:
                    p_str = str(p)
                out.append({"period": p_str, "count": int(r[1] or 0)})
            return out
        else:
            # entity == 'board' → gunakan speed_stats tanpa filter interface
            q = text("""
                SELECT
                  date_trunc(:granularity, log_time) AS period,
                  count(*)::int AS cnt
                FROM board_speed_stats
                WHERE board_id = :board_id
                  AND log_time >= :start_time
                  AND log_time < :end_time
                GROUP BY period
                ORDER BY period ASC
            """)
            res = await db.execute(
                q,
                {
                    "granularity": g,
                    "board_id": str(board_id),
                    "start_time": start_time,
                    "end_time": end_time,
                },
            )
            rows = res.fetchall()
            out = []
            for r in rows:
                p = r[0]
                try:
                    p_str = p.isoformat()
                except Exception:
                    p_str = str(p)
                out.append({"period": p_str, "count": int(r[1] or 0)})
            return out
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Gagal menghitung time-density: {str(e)}"
        )


@router.get("/site-groups/time-density/", response_model=List[TimeDensityItem])
async def time_density_site_groups(
    start_time: datetime = Query(..., alias="startTime"),
    end_time: datetime = Query(..., alias="endTime"),
    site_group: List[str] = Query(..., alias="siteGroup"),
    granularity: str = Query("day", pattern="^(hour|day|month|year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    if end_time <= start_time:
        raise HTTPException(
            status_code=400, detail="endTime harus lebih besar dari startTime"
        )
    if not site_group or len(site_group) == 0:
        raise HTTPException(status_code=400, detail="siteGroup wajib diisi")
    g = granularity if granularity in ["hour", "day", "month", "year"] else "day"
    ph_list = []
    params: Dict[str, Any] = {
        "granularity": g,
        "start_time": start_time,
        "end_time": end_time,
    }
    for idx, sg in enumerate(site_group):
        key = f"g{idx}"
        ph_list.append(f":{key}")
        params[key] = sg
    in_clause = ", ".join(ph_list)
    q = text(f"""
        SELECT
          date_trunc(:granularity, s.log_time) AS period,
          count(*)::int AS cnt
        FROM board_speed_stats s
        JOIN mikrotik_boards b ON b.board_id = s.board_id
        JOIN master_sites ms ON ms.site_id = b.site_id
        WHERE ms.site_name IN ({in_clause})
          AND s.log_time >= :start_time
          AND s.log_time < :end_time
        GROUP BY period
        ORDER BY period ASC
    """)
    try:
        res = await db.execute(q, params)
        rows = res.fetchall()
        out = []
        for r in rows:
            p = r[0]
            try:
                p_str = p.isoformat()
            except Exception:
                p_str = str(p)
            out.append({"period": p_str, "count": int(r[1] or 0)})
        return out
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal menghitung time-density site_group: {str(e)}",
        )


@router.get("/boards/site-groups", response_model=List[SiteGroupSummaryResponse])
async def list_site_groups(
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Daftar site unik beserta jumlah board.
    """
    stmt = (
        select(
            MasterSite.site_name, func.count(MikrotikBoard.board_id).label("count")
        )
        .join(MikrotikBoard, MikrotikBoard.site_id == MasterSite.site_id)
        .group_by(MasterSite.site_name)
        .order_by(MasterSite.site_name.asc())
    )
    res = await db.execute(stmt)
    rows = res.fetchall()
    return [{"site_group": r[0], "count": int(r[1] or 0)} for r in rows]


@router.get("/{board_id}/interfaces", response_model=List[InterfaceListItem])
async def list_interfaces_by_board(
    board_id: UUID,
    active: Optional[bool] = Query(None, description="Hanya interface aktif"),
    primary: Optional[bool] = Query(None, description="Hanya interface uplink utama"),
    q: Optional[str] = Query(None, description="Pencarian nama/label"),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Daftar interface metadata per board dari board_interface_configs.
    """
    filters = [BoardInterfaceConfig.board_id == board_id]
    if active is True:
        filters.append(BoardInterfaceConfig.is_active.is_(True))
    if primary is True:
        filters.append(BoardInterfaceConfig.is_primary_uplink.is_(True))
    if q:
        like = f"%{q.lower()}%"
        # Gunakan SQL text untuk ILIKE pada dua kolom
        stmt = text("""
            SELECT interface_name, interface_label, is_active, is_primary_uplink
            FROM board_interface_configs
            WHERE board_id = :board_id
              AND (lower(interface_name) LIKE :like OR lower(interface_label) LIKE :like)
            ORDER BY interface_label NULLS LAST, interface_name ASC
            LIMIT :limit
        """)
        res = await db.execute(
            stmt, {"board_id": str(board_id), "like": like, "limit": limit}
        )
        rows = res.fetchall()
        return [
            {
                "interface_name": r[0],
                "interface_label": r[1],
                "is_active": bool(r[2]),
                "is_primary_uplink": bool(r[3]),
            }
            for r in rows
        ]
    stmt = (
        select(
            BoardInterfaceConfig.interface_name,
            BoardInterfaceConfig.interface_label,
            BoardInterfaceConfig.is_active,
            BoardInterfaceConfig.is_primary_uplink,
        )
        .where(and_(*filters))
        .order_by(
            BoardInterfaceConfig.interface_label.asc(),
            BoardInterfaceConfig.interface_name.asc(),
        )
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.fetchall()
    return [
        {
            "interface_name": r[0],
            "interface_label": r[1],
            "is_active": bool(r[2]),
            "is_primary_uplink": bool(r[3]),
        }
        for r in rows
    ]


@router.get("/{board_id}/users/pppoe", response_model=List[UserListItem])
async def list_pppoe_users(
    board_id: UUID,
    q: Optional[str] = Query(None, description="Pencarian username"),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Daftar username PPPoE berdasarkan histori penggunaan.
    """
    if q:
        like = f"%{q.lower()}%"
        stmt = text("""
            SELECT DISTINCT pppoe_username
            FROM board_pppoe_usage
            WHERE board_id = :board_id
              AND lower(pppoe_username) LIKE :like
            ORDER BY pppoe_username ASC
            LIMIT :limit
        """)
        res = await db.execute(
            stmt, {"board_id": str(board_id), "like": like, "limit": limit}
        )
    else:
        stmt = text("""
            SELECT DISTINCT pppoe_username
            FROM board_pppoe_usage
            WHERE board_id = :board_id
            ORDER BY pppoe_username ASC
            LIMIT :limit
        """)
        res = await db.execute(stmt, {"board_id": str(board_id), "limit": limit})
    rows = res.fetchall()
    return [{"username": r[0]} for r in rows]


@router.get("/{board_id}/users/hotspot", response_model=List[UserListItem])
async def list_hotspot_users(
    board_id: UUID,
    q: Optional[str] = Query(None, description="Pencarian username"),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Daftar username Hotspot berdasarkan histori penggunaan.
    """
    if q:
        like = f"%{q.lower()}%"
        stmt = text("""
            SELECT DISTINCT username
            FROM hotspot_usage_raw
            WHERE board_id = :board_id
              AND lower(username) LIKE :like
            ORDER BY username ASC
            LIMIT :limit
        """)
        res = await db.execute(
            stmt, {"board_id": str(board_id), "like": like, "limit": limit}
        )
    else:
        stmt = text("""
            SELECT DISTINCT username
            FROM hotspot_usage_raw
            WHERE board_id = :board_id
            ORDER BY username ASC
            LIMIT :limit
        """)
        res = await db.execute(stmt, {"board_id": str(board_id), "limit": limit})
    rows = res.fetchall()
    return [{"username": r[0]} for r in rows]


@router.get("/{board_id}/interfaces/top/", response_model=List[TopAnalysisItem])
async def top_interfaces_v2(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query("sum", pattern="^(sum|max|avg)$"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    limit: int = Query(5, ge=1, le=100),
    q: Optional[str] = Query(None, description="Name filter (contains)"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Top Interfaces (summary-based).
    Unit: Mbps
    """
    rows = await analysis_service.get_interface_analysis(
        db=db,
        board_id=board_id,
        days=days,
        pivot_agg=pivot_agg,
        start_time=start_time,
        end_time=end_time,
        granularity="day",
    )
    # rows: { name, dl, ul, tot } in Mbps
    data = []
    nf = (q or "").lower()
    for r in rows:
        name = (
            r.get("name") or r.get("interface") or r.get("interface_name") or "Unknown"
        )
        if nf and nf not in str(name).lower():
            continue
        dl = float(r.get("dl") or r.get("download_value") or 0)
        ul = float(r.get("ul") or r.get("upload_value") or 0)
        total = float(r.get("tot") or (dl + ul))
        data.append(
            {
                "name": name,
                "download_value": dl,
                "upload_value": ul,
                "total_value": total,
                "unit": "Mbps",
            }
        )
    data.sort(key=lambda x: x["total_value"], reverse=True)
    return data[:limit]


@router.get("/{board_id}/pppoe/top/", response_model=List[TopAnalysisItem])
async def top_pppoe_v2(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query("sum", pattern="^(sum|max|avg)$"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    limit: int = Query(5, ge=1, le=100),
    q: Optional[str] = Query(None, description="Name filter (contains)"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Top PPPoE Users (summary-based).
    Unit: bytes
    """
    rows = await analysis_service.get_pppoe_analysis(
        db=db,
        board_id=board_id,
        days=days,
        pivot_agg=pivot_agg,
        start_time=start_time,
        end_time=end_time,
        granularity="day",
    )
    data = _format_top_usage(rows, q, "bytes")
    return data[:limit]


@router.get("/{board_id}/hotspot/top/", response_model=List[TopAnalysisItem])
async def top_hotspot_v2(
    board_id: UUID,
    days: int = Query(30, ge=1, le=365),
    pivot_agg: str = Query("sum", pattern="^(sum|max|avg)$"),
    start_time: Optional[datetime] = Query(None, alias="startTime"),
    end_time: Optional[datetime] = Query(None, alias="endTime"),
    limit: int = Query(5, ge=1, le=100),
    q: Optional[str] = Query(None, description="Name filter (contains)"),
    db: AsyncSession = Depends(get_db),
    current_user: MasterUser = Depends(deps.get_current_user),
):
    """
    Top Hotspot Users (summary-based).
    Unit: bytes
    """
    rows = await analysis_service.get_hotspot_analysis(
        db=db,
        board_id=board_id,
        days=days,
        pivot_agg=pivot_agg,
        start_time=start_time,
        end_time=end_time,
        granularity="day",
    )
    data = _format_top_usage(rows, q, "bytes")
    return data[:limit]
