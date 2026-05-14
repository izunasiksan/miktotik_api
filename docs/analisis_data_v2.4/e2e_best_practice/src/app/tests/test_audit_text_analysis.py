import json
from pathlib import Path

from app.services.audit_text_analysis import (
    clean_transform_aggregate,
    generate_report_files,
    parse_audit_text,
)


def test_parse_valid_pipe_entries(tmp_path: Path):
    src = tmp_path / "audit_pipe.txt"
    src.write_text(
        "\n".join(
            [
                "2026-03-07T10:00:00Z | alice | login | success",
                "2026-03-07T10:05:00Z | bob | delete_user | failed",
            ]
        ),
        encoding="utf-8",
    )

    parsed = parse_audit_text(str(src))

    assert len(parsed["events"]) == 2
    assert parsed["events"][0]["user"] == "alice"
    assert parsed["events"][1]["hasil"] == "FAILED"
    assert len(parsed["anomalies"]) == 0


def test_parse_valid_key_value_entries(tmp_path: Path):
    src = tmp_path / "audit_kv.txt"
    src.write_text(
        "\n".join(
            [
                "timestamp=2026-03-07 10:00:00; user=carol; aksi=create_board; hasil=success",
                "timestamp=2026-03-07 10:01:00, user=dave, action=update_board, result=warning",
            ]
        ),
        encoding="utf-8",
    )

    parsed = parse_audit_text(str(src))

    assert len(parsed["events"]) == 2
    assert parsed["events"][0]["aksi"] == "CREATE_BOARD"
    assert parsed["events"][1]["hasil"] == "WARNING"


def test_parse_json_line_entry(tmp_path: Path):
    src = tmp_path / "audit_json.txt"
    src.write_text(
        json.dumps(
            {
                "timestamp": "2026-03-07T11:30:00Z",
                "username": "eve",
                "action": "reboot_router",
                "status": "critical",
            }
        ),
        encoding="utf-8",
    )

    parsed = parse_audit_text(str(src))

    assert len(parsed["events"]) == 1
    assert parsed["events"][0]["user"] == "eve"
    assert parsed["events"][0]["isCritical"] is True


def test_detect_missing_and_invalid_fields(tmp_path: Path):
    src = tmp_path / "audit_invalid.txt"
    src.write_text(
        "\n".join(
            [
                "timestamp=not-a-time; user=frank; aksi=login; hasil=success",
                "2026-03-07T12:00:00Z |  | login | success",
                "2026-03-07T12:05:00Z | grace | login | unknown",
                '{"timestamp":"2026-03-07T12:10:00Z","user":"hana","aksi":"login"',
                "ini bukan format audit",
            ]
        ),
        encoding="utf-8",
    )

    parsed = parse_audit_text(str(src))
    anomaly_types = {item["type"] for item in parsed["anomalies"]}

    assert len(parsed["events"]) == 0
    assert "invalid_timestamp" in anomaly_types
    assert "missing_value" in anomaly_types
    assert "invalid_hasil" in anomaly_types
    assert "unparsed_line" in anomaly_types


def test_clean_transform_aggregate_deduplicate():
    parsed = {
        "events": [
            {
                "timestamp": "2026-03-07T10:00:00+00:00",
                "user": "alice",
                "aksi": "LOGIN",
                "hasil": "SUCCESS",
                "isCritical": False,
            },
            {
                "timestamp": "2026-03-07T10:00:00+00:00",
                "user": "alice",
                "aksi": "LOGIN",
                "hasil": "SUCCESS",
                "isCritical": False,
            },
            {
                "timestamp": "2026-03-07T10:05:00+00:00",
                "user": "bob",
                "aksi": "DELETE_USER",
                "hasil": "FAILED",
                "isCritical": True,
            },
        ],
        "anomalies": [{"type": "unparsed_line"}, {"type": "missing_value"}],
    }

    metrics = clean_transform_aggregate(parsed, top_n=3)

    assert metrics["jumlahEvent"] == 2
    assert metrics["distribusiTipeAksi"]["LOGIN"] == 1
    assert metrics["distribusiTipeAksi"]["DELETE_USER"] == 1
    assert metrics["daftarUserTeraktif"][0]["user"] == "alice"
    assert len(metrics["eventCritic"]) == 1
    assert metrics["anomalySummary"]["totalAnomali"] == 2


def test_generate_report_files(tmp_path: Path):
    src = tmp_path / "audit_source.txt"
    src.write_text(
        "\n".join(
            [
                "2026-03-07T10:00:00Z | alice | login | success",
                "2026-03-07T10:10:00Z | alice | delete_user | critical",
                "2026-03-07T10:20:00Z | bob | login | success",
            ]
        ),
        encoding="utf-8",
    )

    output_dir = tmp_path / "output"
    result = generate_report_files(str(src), str(output_dir), top_n=2)

    json_path = Path(result["jsonPath"])
    csv_path = Path(result["csvPath"])

    assert json_path.exists()
    assert csv_path.exists()

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["metrics"]["jumlahEvent"] == 3
    assert payload["metrics"]["distribusiTipeAksi"]["LOGIN"] == 2
    assert len(payload["metrics"]["eventCritic"]) == 1

    csv_text = csv_path.read_text(encoding="utf-8")
    assert "distribusi_tipe_aksi" in csv_text
    assert "daftar_user_teraktif" in csv_text
