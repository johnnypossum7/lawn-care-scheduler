import json
import os
from datetime import datetime, date, timedelta
import calendar

# ─── Data File ───────────────────────────────────────────────────────────────
DATA_FILE = "lawn_care_data.json"

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"customers": [], "jobs": []}

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

# ─── Customer Management ──────────────────────────────────────────────────────
def add_customer(data):
    print("\n── Add New Customer ──")
    name    = input("Customer Name:    ").strip()
    address = input("Address:          ").strip()
    freq    = ""
    while freq not in ("weekly", "biweekly"):
        freq = input("Frequency (weekly / biweekly): ").strip().lower()
    balance = input("Balance Due ($):  ").strip()
    try:
        balance = float(balance)
    except ValueError:
        balance = 0.0

    customer_id = len(data["customers"]) + 1
    customer = {
        "id":        customer_id,
        "name":      name,
        "address":   address,
        "frequency": freq,
        "balance":   round(balance, 2),
    }
    data["customers"].append(customer)
    save_data(data)
    print(f"\n✅  Customer '{name}' added (ID: {customer_id}).")

def list_customers(data):
    if not data["customers"]:
        print("\nNo customers yet.")
        return
    print("\n── Customer List ──")
    print(f"{'ID':<4} {'Name':<22} {'Address':<30} {'Freq':<10} {'Balance':>9}")
    print("─" * 78)
    for c in data["customers"]:
        print(f"{c['id']:<4} {c['name']:<22} {c['address']:<30} {c['frequency']:<10} ${c['balance']:>8.2f}")

def edit_customer(data):
    list_customers(data)
    if not data["customers"]:
        return
    try:
        cid = int(input("\nEnter Customer ID to edit: "))
    except ValueError:
        print("Invalid ID.")
        return
    cust = next((c for c in data["customers"] if c["id"] == cid), None)
    if not cust:
        print("Customer not found.")
        return

    print(f"\nEditing: {cust['name']}  (press Enter to keep current value)")
    name = input(f"Name [{cust['name']}]: ").strip() or cust["name"]
    addr = input(f"Address [{cust['address']}]: ").strip() or cust["address"]
    freq = input(f"Frequency [{cust['frequency']}] (weekly/biweekly): ").strip().lower()
    if freq not in ("weekly", "biweekly"):
        freq = cust["frequency"]
    bal_str = input(f"Balance Due [${cust['balance']:.2f}]: ").strip()
    try:
        bal = float(bal_str)
    except ValueError:
        bal = cust["balance"]

    cust.update({"name": name, "address": addr, "frequency": freq, "balance": round(bal, 2)})
    save_data(data)
    print("✅  Customer updated.")

def delete_customer(data):
    list_customers(data)
    if not data["customers"]:
        return
    try:
        cid = int(input("\nEnter Customer ID to delete: "))
    except ValueError:
        print("Invalid ID.")
        return
    before = len(data["customers"])
    data["customers"] = [c for c in data["customers"] if c["id"] != cid]
    data["jobs"]      = [j for j in data["jobs"]      if j["customer_id"] != cid]
    if len(data["customers"]) < before:
        save_data(data)
        print("✅  Customer (and their jobs) deleted.")
    else:
        print("Customer not found.")

# ─── Job / Scheduling ─────────────────────────────────────────────────────────
def schedule_job(data):
    list_customers(data)
    if not data["customers"]:
        return
    try:
        cid = int(input("\nEnter Customer ID to schedule job for: "))
    except ValueError:
        print("Invalid ID.")
        return
    cust = next((c for c in data["customers"] if c["id"] == cid), None)
    if not cust:
        print("Customer not found.")
        return

    date_str = input("Job Date (YYYY-MM-DD) [today]: ").strip()
    if not date_str:
        job_date = date.today().isoformat()
    else:
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            job_date = date_str
        except ValueError:
            print("Invalid date format. Using today.")
            job_date = date.today().isoformat()

    notes = input("Notes (optional):  ").strip()

    job = {
        "id":          len(data["jobs"]) + 1,
        "customer_id": cid,
        "date":        job_date,
        "status":      "incomplete",
        "notes":       notes,
    }
    data["jobs"].append(job)
    save_data(data)
    print(f"✅  Job scheduled for {cust['name']} on {job_date}.")

def generate_schedule(data):
    """Auto-generate upcoming jobs from today based on each customer's frequency."""
    if not data["customers"]:
        print("\nNo customers to schedule.")
        return
    today = date.today()
    weeks = 4
    try:
        weeks = max(1, int(input("\nGenerate schedule for how many weeks ahead? [4]: ").strip() or "4"))
    except ValueError:
        weeks = 4

    added = 0
    for cust in data["customers"]:
        interval = 7 if cust["frequency"] == "weekly" else 14
        # start from today; step by interval
        d = today
        end = today + timedelta(weeks=weeks)
        while d <= end:
            ds = d.isoformat()
            # avoid duplicates
            exists = any(
                j["customer_id"] == cust["id"] and j["date"] == ds
                for j in data["jobs"]
            )
            if not exists:
                data["jobs"].append({
                    "id":          len(data["jobs"]) + 1,
                    "customer_id": cust["id"],
                    "date":        ds,
                    "status":      "incomplete",
                    "notes":       "",
                })
                added += 1
            d += timedelta(days=interval)

    save_data(data)
    print(f"✅  Generated {added} new job(s) over the next {weeks} week(s).")

def view_jobs(data):
    if not data["jobs"]:
        print("\nNo jobs scheduled.")
        return

    print("\nFilter by:  1) All  2) This week  3) By customer  4) Incomplete only")
    choice = input("Choice [1]: ").strip() or "1"

    jobs = sorted(data["jobs"], key=lambda j: j["date"])

    if choice == "2":
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end   = week_start + timedelta(days=6)
        jobs = [j for j in jobs
                if week_start <= date.fromisoformat(j["date"]) <= week_end]
    elif choice == "3":
        list_customers(data)
        try:
            cid = int(input("Customer ID: "))
        except ValueError:
            cid = -1
        jobs = [j for j in jobs if j["customer_id"] == cid]
    elif choice == "4":
        jobs = [j for j in jobs if j["status"] == "incomplete"]

    if not jobs:
        print("No matching jobs.")
        return

    cust_map = {c["id"]: c for c in data["customers"]}
    print(f"\n{'ID':<4} {'Date':<12} {'Customer':<22} {'Address':<28} {'Status':<12} {'Balance':>9}  Notes")
    print("─" * 100)
    for j in jobs:
        c = cust_map.get(j["customer_id"], {})
        status_icon = "✅" if j["status"] == "complete" else "⏳"
        print(
            f"{j['id']:<4} {j['date']:<12} {c.get('name','?'):<22} "
            f"{c.get('address','?'):<28} {status_icon} {j['status']:<10} "
            f"${c.get('balance',0):>8.2f}  {j['notes']}"
        )

def mark_job(data):
    view_jobs(data)
    if not data["jobs"]:
        return
    try:
        jid = int(input("\nEnter Job ID to mark: "))
    except ValueError:
        print("Invalid ID.")
        return
    job = next((j for j in data["jobs"] if j["id"] == jid), None)
    if not job:
        print("Job not found.")
        return
    print(f"Current status: {job['status']}")
    new_status = ""
    while new_status not in ("complete", "incomplete"):
        new_status = input("New status (complete / incomplete): ").strip().lower()
    job["status"] = new_status
    save_data(data)
    print(f"✅  Job {jid} marked as {new_status}.")

def update_balance(data):
    list_customers(data)
    if not data["customers"]:
        return
    try:
        cid = int(input("\nCustomer ID to update balance: "))
    except ValueError:
        print("Invalid.")
        return
    cust = next((c for c in data["customers"] if c["id"] == cid), None)
    if not cust:
        print("Not found.")
        return
    print(f"Current balance: ${cust['balance']:.2f}")
    try:
        new_bal = float(input("New Balance Due ($): ").strip())
    except ValueError:
        print("Invalid amount.")
        return
    cust["balance"] = round(new_bal, 2)
    save_data(data)
    print(f"✅  Balance updated to ${cust['balance']:.2f}.")

# ─── Calendar View ────────────────────────────────────────────────────────────
def show_calendar(data):
    today = date.today()
    month_str = input(f"\nMonth to view (YYYY-MM) [{today.strftime('%Y-%m')}]: ").strip()
    try:
        view_date = datetime.strptime(month_str or today.strftime("%Y-%m"), "%Y-%m")
    except ValueError:
        view_date = today.replace(day=1)

    year, month = view_date.year, view_date.month
    _, num_days = calendar.monthrange(year, month)

    # build a day → job count map
    cust_map = {c["id"]: c for c in data["customers"]}
    day_jobs: dict[int, list] = {}
    for j in data["jobs"]:
        jd = date.fromisoformat(j["date"])
        if jd.year == year and jd.month == month:
            day_jobs.setdefault(jd.day, []).append(j)

    print(f"\n{'─'*42}")
    print(f"  📅  {calendar.month_name[month]} {year}")
    print(f"{'─'*42}")
    print("  Mo  Tu  We  Th  Fr  Sa  Su")
    first_weekday = date(year, month, 1).weekday()  # 0=Mon
    week_line = "  " + "    " * first_weekday
    for day in range(1, num_days + 1):
        tag = f"{day:>2}"
        if day in day_jobs:
            count = len(day_jobs[day])
            tag = f"\033[32m{day:>2}\033[0m"  # green
        week_line += f"{tag}  "
        weekday = (first_weekday + day - 1) % 7
        if weekday == 6 or day == num_days:
            print(week_line)
            week_line = "  "
    print(f"{'─'*42}")
    print("  \033[32mGreen\033[0m = jobs scheduled\n")

    if day_jobs:
        print("Jobs this month:")
        for day in sorted(day_jobs):
            for j in day_jobs[day]:
                c = cust_map.get(j["customer_id"], {})
                icon = "✅" if j["status"] == "complete" else "⏳"
                print(f"  {year}-{month:02d}-{day:02d}  {icon}  {c.get('name','?')}  —  {c.get('address','')}")

# ─── Main Menu ────────────────────────────────────────────────────────────────
def main():
    data = load_data()
    menu = """
╔══════════════════════════════════════╗
║   🌿  Lawn Care Scheduler            ║
╠══════════════════════════════════════╣
║  CUSTOMERS                           ║
║   1. Add customer                    ║
║   2. List customers                  ║
║   3. Edit customer                   ║
║   4. Delete customer                 ║
║   5. Update balance due              ║
╠══════════════════════════════════════╣
║  SCHEDULING                          ║
║   6. Schedule a job (manual)         ║
║   7. Auto-generate schedule          ║
║   8. View / filter jobs              ║
║   9. Mark job complete / incomplete  ║
║  10. Calendar view                   ║
╠══════════════════════════════════════╣
║   0. Quit                            ║
╚══════════════════════════════════════╝"""

    actions = {
        "1": add_customer,
        "2": list_customers,
        "3": edit_customer,
        "4": delete_customer,
        "5": update_balance,
        "6": schedule_job,
        "7": generate_schedule,
        "8": view_jobs,
        "9": mark_job,
        "10": show_calendar,
    }

    while True:
        print(menu)
        choice = input("Select option: ").strip()
        if choice == "0":
            print("\nGoodbye! 🌱\n")
            break
        elif choice in actions:
            actions[choice](data)
            data = load_data()   # reload in case of external edits
        else:
            print("Invalid option, try again.")

if __name__ == "__main__":
    main()
