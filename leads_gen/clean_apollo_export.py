"""
Parse Apollo CSV export (handles quoted newlines in Short Description)
and write a clean CSV: one row per company, newlines in fields replaced with space,
plus a 'segment' column for APOLLO_EXACT_FILTERS workflow.

Usage:
  python clean_apollo_export.py <input.csv> [output.csv]
  python clean_apollo_export.py <input.csv> apollo-accounts-export-cleaned.csv --append
"""
import csv
import sys

OUTPUT = "apollo-accounts-export-cleaned.csv"
SEGMENT = "lead_gen_appointment_setting"


def parse_and_clean_rows(in_path, segment=SEGMENT):
    """Read CSV, handle quoted newlines, return (header, list of data rows)."""
    with open(in_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return None, []
    header = rows[0]
    if "segment" not in header:
        header = header + ["segment"]
    data_rows = []
    for i, row in enumerate(rows):
        if i == 0:
            continue
        while len(row) < len(header) - 1:
            row.append("")
        if len(row) == len(header) - 1:
            row.append(segment)
        elif len(row) >= len(header):
            row = row[: len(header) - 1] + [segment]
        else:
            row = row + [segment]
        row = [str(c).replace("\r\n", " ").replace("\n", " ").replace("\r", " ") for c in row]
        data_rows.append(row[: len(header)])
    return header, data_rows


def main():
    args = [a for a in sys.argv[1:] if a != "--append"]
    append = "--append" in sys.argv
    in_path = args[0] if args else "apollo-accounts-export.csv"
    out_path = args[1] if len(args) >= 2 else OUTPUT

    header, new_data = parse_and_clean_rows(in_path)
    if header is None:
        print("No rows read")
        return

    if append and out_path:
        try:
            with open(out_path, "r", encoding="utf-8", newline="") as f:
                reader = csv.reader(f)
                existing = list(reader)
            if existing:
                existing_header = existing[0]
                existing_data = existing[1:]
                # Keep existing header; append new data (trim/pad new rows to match)
                def fit_row(row, n):
                    return row[:n] if len(row) >= n else row + [""] * (n - len(row))
                ncols = len(existing_header)
                all_data = existing_data + [fit_row(r, ncols) for r in new_data]
                with open(out_path, "w", encoding="utf-8", newline="") as f:
                    writer = csv.writer(f)
                    writer.writerow(existing_header)
                    writer.writerows(all_data)
                print(f"Appended {len(new_data)} companies to {out_path}. Total: {len(all_data)} (was {len(existing_data)})")
                return
        except FileNotFoundError:
            pass

    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(new_data)
    print(f"Wrote {len(new_data)} companies to {out_path} (with segment={SEGMENT})")

if __name__ == "__main__":
    main()
