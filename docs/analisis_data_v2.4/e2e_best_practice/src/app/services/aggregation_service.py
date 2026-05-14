import logging
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import and_, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.models.mikrotik import (
    BoardClientStat,
    BoardDailySummary,
    BoardInterfaceDailySummary,
    BoardMonthlySummary,
    BoardResourceStat,
    BoardSpeedStat,
    HotspotUsageMonthly,
    HotspotUsageRaw,
    MikrotikBoard,
)

logger = logging.getLogger(__name__)


async def aggregate_daily_stats(
    db: AsyncSession,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
):
    """
    Agregasi data dari tabel stats realtime ke tabel daily summary.
    Optimized: Menggunakan Group By dan Bulk Upsert untuk efisiensi (Phase 12).
    V2.3: Menggunakan datetime parameters untuk presisi filter.
    """
    if start_time is None:
        # Default: Kemarin full 24 jam
        yesterday = date.today() - timedelta(days=1)
        start_time = datetime.combine(yesterday, datetime.min.time())

    if end_time is None:
        end_time = datetime.combine(start_time.date(), datetime.max.time())

    target_date = start_time.date()
    logger.info(
        f"Starting optimized daily aggregation for range: {start_time} - {end_time}"
    )

    try:
        # 0. Hitung Expected Samples (Berdasarkan interval 5 menit = 288 samples/day)
        # V2.4.2: Kalkulasi dinamis berdasarkan rentang waktu
        total_seconds = (end_time - start_time).total_seconds()
        expected_samples = max(1, int(total_seconds / 300))  # 300s = 5 menit

        # 1. Resource Stats (Group by Board)
        res_stmt = (
            select(
                BoardResourceStat.board_id,
                func.avg(BoardResourceStat.cpu_load).label("avg_cpu"),
                func.max(BoardResourceStat.cpu_load).label("max_cpu"),
                func.min(BoardResourceStat.free_memory).label("min_mem"),
                func.count(BoardResourceStat.cpu_load).label("sample_count"),
            )
            .where(
                and_(
                    BoardResourceStat.log_time >= start_time,
                    BoardResourceStat.log_time <= end_time,
                )
            )
            .group_by(BoardResourceStat.board_id)
        )

        res_results = await db.execute(res_stmt)
        res_map = {row.board_id: row for row in res_results}

        # 2. Speed Stats (Group by Board)
        speed_stmt = (
            select(
                BoardSpeedStat.board_id,
                func.avg(BoardSpeedStat.download_mbps).label("avg_dl"),
                func.max(BoardSpeedStat.download_mbps).label("max_dl"),
                func.avg(BoardSpeedStat.upload_mbps).label("avg_ul"),
                func.max(BoardSpeedStat.upload_mbps).label("max_ul"),
                func.count(BoardSpeedStat.download_mbps).label("sample_count"),
            )
            .where(
                and_(
                    BoardSpeedStat.log_time >= start_time,
                    BoardSpeedStat.log_time <= end_time,
                )
            )
            .group_by(BoardSpeedStat.board_id)
        )

        speed_results = await db.execute(speed_stmt)
        speed_map = {row.board_id: row for row in speed_results}

        # 3. Client Stats (Group by Board)
        client_stmt = (
            select(
                BoardClientStat.board_id,
                func.avg(BoardClientStat.total_hotspot).label("avg_hs"),
                func.max(BoardClientStat.total_hotspot).label("max_hs"),
                func.avg(BoardClientStat.total_pppoe).label("avg_pppoe"),
                func.max(BoardClientStat.total_pppoe).label("max_pppoe"),
                func.count(BoardClientStat.total_hotspot).label("sample_count"),
            )
            .where(
                and_(
                    BoardClientStat.log_time >= start_time,
                    BoardClientStat.log_time <= end_time,
                )
            )
            .group_by(BoardClientStat.board_id)
        )

        client_results = await db.execute(client_stmt)
        client_map = {row.board_id: row for row in client_results}

        # 4. Ambil semua board ID untuk memastikan coverage (optional, but good for empty stats)
        board_stmt = select(MikrotikBoard.board_id)
        board_res = await db.execute(board_stmt)
        all_board_ids = board_res.scalars().all()

        # 5. Construct Bulk Data
        upsert_values = []
        for board_id in all_board_ids:
            res_data = res_map.get(board_id)
            speed_data = speed_map.get(board_id)
            client_data = client_map.get(board_id)

            # Skip jika tidak ada data sama sekali untuk board ini
            if not any([res_data, speed_data, client_data]):
                continue

            # V2.4.2: Hitung Gap Ratio & Completeness
            # Gunakan sample count terbesar dari 3 sensor sebagai acuan
            actual_samples = max(
                (res_data.sample_count if res_data else 0),
                (speed_data.sample_count if speed_data else 0),
                (client_data.sample_count if client_data else 0),
            )
            gap_count = max(0, expected_samples - actual_samples)
            gap_ratio = (gap_count / expected_samples) * 100 if expected_samples > 0 else 0
            completeness = (actual_samples / expected_samples) * 100 if expected_samples > 0 else 0

            summary_data = {
                "board_id": board_id,
                "log_date": target_date,
                "avg_cpu_load": int(res_data.avg_cpu or 0) if res_data else 0,
                "max_cpu_load": int(res_data.max_cpu or 0) if res_data else 0,
                "min_free_memory": int(res_data.min_mem or 0) if res_data else 0,
                "avg_download": int(speed_data.avg_dl or 0) if speed_data else 0,
                "max_download": int(speed_data.max_dl or 0) if speed_data else 0,
                "avg_upload": int(speed_data.avg_ul or 0) if speed_data else 0,
                "max_upload": int(speed_data.max_ul or 0) if speed_data else 0,
                "avg_hotspot_users": int(client_data.avg_hs or 0) if client_data else 0,
                "max_hotspot_users": int(client_data.max_hs or 0) if client_data else 0,
                "avg_pppoe_users": (
                    int(client_data.avg_pppoe or 0) if client_data else 0
                ),
                "max_pppoe_users": (
                    int(client_data.max_pppoe or 0) if client_data else 0
                ),
                # Metadata V2.4.2
                "cpu_sample_count": res_data.sample_count if res_data else 0,
                "speed_sample_count": speed_data.sample_count if speed_data else 0,
                "gap_ratio": gap_ratio,
                "data_completeness": completeness,
                "accuracy_pct": completeness,  # Sync accuracy ke completeness
            }
            upsert_values.append(summary_data)

        if upsert_values:
            # 6. Bulk Upsert
            stmt = insert(BoardDailySummary).values(upsert_values)
            update_dict = {
                col.name: col
                for col in stmt.excluded
                if col.name not in ["summary_id", "board_id", "log_date", "created_at"]
            }

            # On Conflict: Update all fields except PK/Unique keys
            upsert_stmt = stmt.on_conflict_do_update(
                index_elements=[
                    "board_id",
                    "log_date",
                ],  # Must match UniqueConstraint/Index
                set_=update_dict,
            )

            await db.execute(upsert_stmt)
            await db.commit()
            logger.info(f"Daily aggregation upserted {len(upsert_values)} records.")
        else:
            logger.info("No data to aggregate for today.")

        # 7. Interface Stats (Group by Board and Interface)
        # V2.4.2: Optimized to include PERCENTILE_CONT in main query to avoid N+1 issue
        interface_stmt = (
            select(
                BoardSpeedStat.board_id,
                BoardSpeedStat.interface_name,
                func.avg(BoardSpeedStat.download_mbps).label("avg_dl"),
                func.max(BoardSpeedStat.download_mbps).label("max_dl"),
                func.avg(BoardSpeedStat.upload_mbps).label("avg_ul"),
                func.max(BoardSpeedStat.upload_mbps).label("max_ul"),
                func.percentile_cont(0.95)
                .within_group(BoardSpeedStat.download_mbps)
                .label("p95_dl"),
            )
            .where(
                and_(
                    BoardSpeedStat.log_time >= start_time,
                    BoardSpeedStat.log_time <= end_time,
                )
            )
            .group_by(BoardSpeedStat.board_id, BoardSpeedStat.interface_name)
        )

        interface_results = await db.execute(interface_stmt)
        interface_upsert_values = []

        for row in interface_results:
            interface_upsert_values.append(
                {
                    "board_id": row.board_id,
                    "interface_name": row.interface_name,
                    "log_date": target_date,
                    "avg_download_mbps": float(row.avg_dl or 0),
                    "max_download_mbps": float(row.max_dl or 0),
                    "p95_download_mbps": float(row.p95_dl or 0),
                    "avg_upload_mbps": float(row.avg_ul or 0),
                    "max_upload_mbps": float(row.max_ul or 0),
                }
            )

        if interface_upsert_values:
            stmt_if = insert(BoardInterfaceDailySummary).values(interface_upsert_values)
            update_dict_if = {
                col.name: col
                for col in stmt_if.excluded
                if col.name
                not in [
                    "summary_id",
                    "board_id",
                    "interface_name",
                    "log_date",
                    "created_at",
                ]
            }

            upsert_stmt_if = stmt_if.on_conflict_do_update(
                index_elements=["board_id", "interface_name", "log_date"],
                set_=update_dict_if,
            )

            await db.execute(upsert_stmt_if)
            await db.commit()
            logger.info(
                f"Interface daily aggregation upserted {len(interface_upsert_values)} records."
            )

    except Exception as e:
        logger.error(f"Critical Error in daily aggregation: {e}")
        await db.rollback()


async def aggregate_monthly_stats(
    db: AsyncSession,
    year: Optional[int] = None,
    month: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
):
    """
    Agregasi data dari BoardDailySummary ke BoardMonthlySummary.
    Optimized: Menggunakan Group By dan Bulk Upsert.
    V2.3: Mendukung datetime parameters untuk range dinamis.
    """
    if start_time is None:
        if year is None or month is None:
            # Default: Bulan lalu
            today = date.today()
            first_this_month = today.replace(day=1)
            last_month_date = first_this_month - timedelta(days=1)
            year = last_month_date.year
            month = last_month_date.month

        start_time = datetime(year, month, 1)

    if end_time is None:
        # Akhir bulan dari start_time
        next_month = start_time.month % 12 + 1
        next_month_year = start_time.year + (start_time.month // 12)
        end_time = datetime(next_month_year, next_month, 1) - timedelta(seconds=1)

    logger.info(
        f"Starting optimized monthly aggregation for range: {start_time} - {end_time}"
    )

    try:
        # Group by Board directly from Daily Summary
        # V2.3: Use range filter instead of extract for index performance
        stmt = (
            select(
                BoardDailySummary.board_id,
                func.avg(BoardDailySummary.avg_cpu_load).label("avg_cpu"),
                func.max(BoardDailySummary.max_cpu_load).label("max_cpu"),
                func.avg(BoardDailySummary.avg_download).label("avg_dl"),
                func.max(BoardDailySummary.max_download).label("max_dl"),
                func.sum(BoardDailySummary.total_download_bytes).label("sum_dl_bytes"),
                func.avg(BoardDailySummary.avg_upload).label("avg_ul"),
                func.max(BoardDailySummary.max_upload).label("max_ul"),
                func.sum(BoardDailySummary.total_upload_bytes).label("sum_ul_bytes"),
                func.avg(BoardDailySummary.avg_hotspot_users).label("avg_hs"),
                func.max(BoardDailySummary.max_hotspot_users).label("max_hs"),
            )
            .where(
                and_(
                    BoardDailySummary.log_date >= start_time.date(),
                    BoardDailySummary.log_date <= end_time.date(),
                )
            )
            .group_by(BoardDailySummary.board_id)
        )

        results = await db.execute(stmt)
        upsert_values = []
        log_month = start_time.date().replace(day=1)

        for row in results:
            summary_data = {
                "board_id": row.board_id,
                "log_month": log_month,
                "avg_cpu_load": int(row.avg_cpu or 0),
                "max_cpu_load": int(row.max_cpu or 0),
                "avg_download": int(row.avg_dl or 0),
                "max_download": int(row.max_dl or 0),
                "total_download_bytes": int(row.sum_dl_bytes or 0),
                "avg_upload": int(row.avg_ul or 0),
                "max_upload": int(row.max_ul or 0),
                "total_upload_bytes": int(row.sum_ul_bytes or 0),
                "avg_hotspot_users": int(row.avg_hs or 0),
                "max_hotspot_users": int(row.max_hs or 0),
            }
            upsert_values.append(summary_data)

        if upsert_values:
            stmt = insert(BoardMonthlySummary).values(upsert_values)
            update_dict = {
                col.name: col
                for col in stmt.excluded
                if col.name not in ["summary_id", "board_id", "log_month", "created_at"]
            }

            upsert_stmt = stmt.on_conflict_do_update(
                index_elements=["board_id", "log_month"], set_=update_dict
            )

            await db.execute(upsert_stmt)
            await db.commit()
            logger.info(f"Monthly aggregation upserted {len(upsert_values)} records.")

    except Exception as e:
        logger.error(f"Critical Error in monthly aggregation: {e}")
        await db.rollback()


async def aggregate_loyalty_monthly(
    db: AsyncSession,
    year: Optional[int] = None,
    month: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
):
    """
    Phase 16: Agregasi Loyalty User Bulanan.
    Menghitung total penggunaan & frekuensi login user dalam satu bulan.
    V2.3: Mendukung datetime parameters untuk range dinamis.
    """
    if start_time is None:
        if year is None or month is None:
            # Default: Bulan lalu
            today = date.today()
            first_this_month = today.replace(day=1)
            last_month_date = first_this_month - timedelta(days=1)
            year = last_month_date.year
            month = last_month_date.month

        start_time = datetime(year, month, 1)

    if end_time is None:
        # Akhir bulan dari start_time
        next_month = start_time.month % 12 + 1
        next_month_year = start_time.year + (start_time.month // 12)
        end_time = datetime(next_month_year, next_month, 1) - timedelta(seconds=1)

    logger.info(f"Starting loyalty aggregation for range: {start_time} - {end_time}")

    month_period = start_time.date().replace(day=1)

    try:
        # Group by Username from HotspotUsageRaw
        # V2.3: Use range filter instead of extract for index performance
        stmt = (
            select(
                HotspotUsageRaw.username,
                func.sum(HotspotUsageRaw.daily_download).label("total_dl"),
                func.sum(HotspotUsageRaw.daily_upload).label("total_ul"),
                func.sum(HotspotUsageRaw.daily_uptime).label("total_time"),
                func.count(func.distinct(HotspotUsageRaw.log_date)).label("freq_days"),
            )
            .where(
                and_(
                    HotspotUsageRaw.log_date >= start_time.date(),
                    HotspotUsageRaw.log_date <= end_time.date(),
                )
            )
            .group_by(HotspotUsageRaw.username)
        )

        results = await db.execute(stmt)
        upsert_values = []

        for row in results:
            freq_days = int(row.freq_days or 0)
            is_frequent = freq_days >= 10  # Logic bisnis: Loyal jika aktif >= 10 hari

            summary_data = {
                "username": row.username,
                "month_period": month_period,
                "total_download": int(row.total_dl or 0),
                "total_upload": int(row.total_ul or 0),
                "total_uptime": int(row.total_time or 0),
                "frequency_days": freq_days,
                "is_frequent_user": is_frequent,
            }
            upsert_values.append(summary_data)

        if upsert_values:
            stmt = insert(HotspotUsageMonthly).values(upsert_values)
            update_dict = {
                col.name: col
                for col in stmt.excluded
                if col.name not in ["summary_id", "username", "month_period"]
            }

            upsert_stmt = stmt.on_conflict_do_update(
                constraint="unique_user_monthly", set_=update_dict
            )

            await db.execute(upsert_stmt)
            await db.commit()
            logger.info(f"Loyalty aggregation upserted {len(upsert_values)} users.")
        else:
            logger.info("No user activity found for loyalty aggregation.")

    except Exception as e:
        logger.error(f"Critical Error in loyalty aggregation: {e}")
        await db.rollback()


async def run_daily_aggregation_job():
    """
    Wrapper untuk scheduler. Menjalankan agregasi harian.
    """
    logger.info("Scheduler: Starting daily aggregation job")
    async with SessionLocal() as db:
        await aggregate_daily_stats(db)


async def run_monthly_aggregation_job():
    """
    Wrapper untuk scheduler. Menjalankan agregasi bulanan.
    Biasanya dijalankan setiap tanggal 1.
    V2.3: Menggunakan datetime parameters untuk presisi.
    """
    logger.info("Scheduler: Starting monthly aggregation job")
    today = date.today()
    # Agregasi bulan sebelumnya
    first_this_month = today.replace(day=1)
    start_time = datetime.combine(
        first_this_month - timedelta(days=1), datetime.min.time()
    ).replace(day=1)
    # end_time adalah akhir hari kemarin
    end_time = datetime.combine(
        first_this_month - timedelta(seconds=1), datetime.max.time()
    )

    async with SessionLocal() as db:
        await aggregate_monthly_stats(db, start_time=start_time, end_time=end_time)
        # Phase 16: Jalankan Loyalty Aggregation juga
        await aggregate_loyalty_monthly(db, start_time=start_time, end_time=end_time)
