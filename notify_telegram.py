import os
import json
import urllib.request
import urllib.error
from datetime import date, datetime

# ── Config via environment variables ──────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
TELEGRAM_TOKEN = "7948367084:AAEQsXeBpemZGA14qBLzkCGtnKaD6hWDGYE"
TELEGRAM_CHAT_ID = "79424548"

# ── Helpers ───────────────────────────────────────────────────
def sb_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def send_telegram(msg):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": msg,
        "parse_mode": "HTML",
    }).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def fmt_time(t):
    # "07:00:00" → "07:00"
    return t[:5] if t else "—"

def fmt_date_br(d):
    # "2026-03-11" → "11/03/2026"
    parts = d.split("-")
    return f"{parts[2]}/{parts[1]}/{parts[0]}"

# ── Main ──────────────────────────────────────────────────────
today = date.today()
today_str = today.strftime("%Y-%m-%d")
weekday = today.weekday()  # 0=Mon ... 4=Fri

# só roda de segunda a sexta (segurança extra além do cron)
if weekday > 4:
    print("Fim de semana — sem envio.")
    exit(0)

day_names = ["Segunda-feira", "Terça-feira", "Quarta-feira",
             "Quinta-feira", "Sexta-feira"]
day_name = day_names[weekday]

# busca reservas do dia ordenadas por horário
bookings = sb_get(
    f"reservas?date=eq.{today_str}&order=time_start.asc&select=*"
)

date_br = fmt_date_br(today_str)
header = (
    f"📅 <b>Reservas de hoje — {day_name}, {date_br}</b>\n"
    f"{'─' * 32}\n"
)

if not bookings:
    msg = header + "\n✅ <i>Nenhuma reserva agendada para hoje.</i>"
else:
    lines = []
    for b in bookings:
        line = (
            f"\n🏫 <b>{b.get('space','—')}</b>\n"
            f"   🕐 {fmt_time(b.get('time_start',''))} – {fmt_time(b.get('time_end',''))}\n"
            f"   👤 {b.get('teacher','—')}\n"
            f"   🎓 {b.get('turma','—')}"
        )
        if b.get("lesson"):
            line += f"\n   📖 {b['lesson']}"
        if b.get("notes"):
            line += f"\n   📌 {b['notes']}"
        lines.append(line)

    total = len(bookings)
    footer = f"\n\n{'─' * 32}\n📊 Total: <b>{total} reserva{'s' if total != 1 else ''}</b>"
    msg = header + "\n".join(lines) + footer

print("Mensagem montada:")
print(msg)
send_telegram(msg)
print("✅ Enviado com sucesso!")
