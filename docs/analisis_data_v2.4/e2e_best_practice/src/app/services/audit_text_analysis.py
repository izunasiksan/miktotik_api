import csv
import json
import logging
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

_KEY_ALIASES = {
    "timestamp": "timestamp",
    "time": "timestamp",
    "waktu": "timestamp",
    "created_at": "timestamp",
    "createdat": "timestamp",
    "datetime": "timestamp",
    "date": "timestamp",
    "user": "user",
    "username": "user",
    "user_id": "user",
    "userid": "user",
    "aksi": "aksi",
    "action": "aksi",
    "event": "aksi",
    "activity": "aksi",
    "hasil": "hasil",
    "result": "hasil",
    "status": "hasil",
    "outcome": "hasil",
}

_VALID_HASIL = {"SUCCESS", "FAILED", "CRITICAL", "WARNING", "INFO"}


def _structured_log(event: str, payload: Dict[str, Any]) -> None:
    logger.info(json.dumps({"event": event, **payload}, default=str))


def _normalize_key(key: str) -> str:
    return key.strip().lower().replace(" ", "_")


def _normalize_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    normalized: Dict[str, Any] = {}
    for key, value in raw.items():
        mapped = _KEY_ALIASES.get(_normalize_key(str(key)))
        if mapped:
            normalized[mapped] = str(value).strip() if value is not None else ""
    return normalized


def _parse_delimited_line(line: str) -> Optional[Dict[str, Any]]:
    if "|" in line:
        parts = [part.strip() for part in line.split("|")]
        if len(parts) >= 4:
            return {
                "timestamp": parts[0],
                "user": parts[1],
                "aksi": parts[2],
                "hasil": parts[3],
            }
    if "\t" in line:
        parts = [part.strip() for part in line.split("\t")]
        if len(parts) >= 4:
            return {
                "timestamp": parts[0],
                "user": parts[1],
                "aksi": parts[2],
                "hasil": parts[3],
            }
    if ";" in line and "=" in line:
        pairs = [token.strip() for token in line.split(";") if token.strip()]
        raw: Dict[str, Any] = {}
        for pair in pairs:
            if "=" not in pair:
                continue
            key, value = pair.split("=", 1)
            raw[key.strip()] = value.strip()
        return raw or None
    if "," in line and "=" in line:
        pairs = [token.strip() for token in line.split(",") if token.strip()]
        raw = {}
        for pair in pairs:
            if "=" not in pair:
                continue
            key, value = pair.split("=", 1)
            raw[key.strip()] = value.strip()
        return raw or None
    return None


def _parse_timestamp(value: str) -> Optional[datetime]:
    raw = value.strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        pass
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _validate_record(record: Dict[str, Any], line_number: int) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    anomalies: List[Dict[str, Any]] = []
    for field in ("timestamp", "user", "aksi", "hasil"):
        if not record.get(field):
            anomalies.append(
                {
                    "lineNumber": line_number,
                    "type": "missing_value",
                    "field": field,
                    "raw": record,
                }
            )
    if anomalies:
        return None, anomalies

    parsed_ts = _parse_timestamp(record["timestamp"])
    if not parsed_ts:
        return None, [
            {
                "lineNumber": line_number,
                "type": "invalid_timestamp",
                "field": "timestamp",
                "raw": record,
            }
        ]

    hasil = str(record["hasil"]).strip().upper()
    if hasil not in _VALID_HASIL:
        anomalies.append(
            {
                "lineNumber": line_number,
                "type": "invalid_hasil",
                "field": "hasil",
                "raw": record,
            }
        )
        return None, anomalies

    cleaned = {
        "timestamp": parsed_ts.isoformat(),
        "user": str(record["user"]).strip(),
        "aksi": str(record["aksi"]).strip().upper().replace(" ", "_"),
        "hasil": hasil,
        "isCritical": hasil in {"CRITICAL", "FAILED"},
    }
    return cleaned, []


def parse_audit_text(file_path: str) -> Dict[str, Any]:
    path = Path(file_path)
    lines = path.read_text(encoding="utf-8").splitlines()
    events: List[Dict[str, Any]] = []
    anomalies: List[Dict[str, Any]] = []

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped:
            continue

        parsed: Optional[Dict[str, Any]] = None
        if stripped.startswith("{") and stripped.endswith("}"):
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                anomalies.append(
                    {
                        "lineNumber": idx,
                        "type": "invalid_json",
                        "field": "line",
                        "raw": stripped,
                    }
                )
                continue
        else:
            parsed = _parse_delimited_line(stripped)

        if not parsed:
            anomalies.append(
                {
                    "lineNumber": idx,
                    "type": "unparsed_line",
                    "field": "line",
                    "raw": stripped,
                }
            )
            continue

        normalized = _normalize_record(parsed)
        valid_record, validation_errors = _validate_record(normalized, idx)
        if validation_errors:
            anomalies.extend(validation_errors)
            continue
        if valid_record:
            events.append(valid_record)

    _structured_log(
        "audit_text_parsed",
        {
            "filePath": str(path),
            "totalLines": len(lines),
            "eventCount": len(events),
            "anomalyCount": len(anomalies),
        },
    )

    return {"events": events, "anomalies": anomalies, "totalLines": len(lines)}


def clean_transform_aggregate(parsed: Dict[str, Any], top_n: int = 5) -> Dict[str, Any]:
    raw_events = parsed.get("events", [])
    anomalies = parsed.get("anomalies", [])

    unique: Dict[Tuple[str, str, str, str], Dict[str, Any]] = {}
    for event in raw_events:
        key = (event["timestamp"], event["user"], event["aksi"], event["hasil"])
        unique[key] = event
    events = sorted(unique.values(), key=lambda item: item["timestamp"])

    action_counter = Counter(event["aksi"] for event in events)
    user_counter = Counter(event["user"] for event in events)
    critic_events = [event for event in events if event.get("isCritical")]

    report = {
        "jumlahEvent": len(events),
        "distribusiTipeAksi": dict(action_counter),
        "daftarUserTeraktif": [
            {"user": user, "eventCount": count} for user, count in user_counter.most_common(top_n)
        ],
        "eventCritic": critic_events,
        "anomalySummary": {
            "totalAnomali": len(anomalies),
            "missingValue": sum(1 for item in anomalies if item.get("type") == "missing_value"),
            "invalidTimestamp": sum(1 for item in anomalies if item.get("type") == "invalid_timestamp"),
            "invalidHasil": sum(1 for item in anomalies if item.get("type") == "invalid_hasil"),
            "unparsedLine": sum(1 for item in anomalies if item.get("type") == "unparsed_line"),
            "invalidJson": sum(1 for item in anomalies if item.get("type") == "invalid_json"),
        },
    }

    _structured_log(
        "audit_text_aggregated",
        {
            "jumlahEvent": report["jumlahEvent"],
            "uniqueAksi": len(report["distribusiTipeAksi"]),
            "criticalEvents": len(report["eventCritic"]),
            "totalAnomali": report["anomalySummary"]["totalAnomali"],
        },
    )
    return report


def generate_report_files(
    input_file: str,
    output_dir: str,
    top_n: int = 5,
) -> Dict[str, Any]:
    parsed = parse_audit_text(input_file)
    metrics = clean_transform_aggregate(parsed, top_n=top_n)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    json_path = output_path / "audit_report.json"
    csv_path = output_path / "audit_report.csv"

    payload = {
        "inputFile": str(Path(input_file)),
        "generatedAt": datetime.now(UTC).isoformat(),
        "metrics": metrics,
        "anomalies": parsed["anomalies"],
    }
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    rows: List[Dict[str, Any]] = [
        {"section": "summary", "metric": "jumlah_event", "value": metrics["jumlahEvent"]},
        {"section": "summary", "metric": "total_anomali", "value": metrics["anomalySummary"]["totalAnomali"]},
    ]
    for aksi, count in metrics["distribusiTipeAksi"].items():
        rows.append({"section": "distribusi_tipe_aksi", "metric": aksi, "value": count})
    for user in metrics["daftarUserTeraktif"]:
        rows.append({"section": "daftar_user_teraktif", "metric": user["user"], "value": user["eventCount"]})
    for index, event in enumerate(metrics["eventCritic"], start=1):
        rows.append(
            {
                "section": "event_critic",
                "metric": f"event_{index}",
                "value": json.dumps(event, ensure_ascii=False),
            }
        )

    with csv_path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=["section", "metric", "value"])
        writer.writeheader()
        writer.writerows(rows)

    _structured_log(
        "audit_report_generated",
        {"jsonPath": str(json_path), "csvPath": str(csv_path), "rowCount": len(rows)},
    )
    return {
        "jsonPath": str(json_path),
        "csvPath": str(csv_path),
        "metrics": metrics,
        "anomalies": parsed["anomalies"],
    }
