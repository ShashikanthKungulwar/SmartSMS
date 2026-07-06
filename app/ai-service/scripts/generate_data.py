import random
import re
import csv
from faker import Faker

fake = Faker('en_IN')

BANKS = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak", "PNB", "BOB"]
MERCHANTS = ["Amazon", "Flipkart", "Myntra", "Swiggy", "Zomato", "BigBasket", "Meesho"]
COURIERS = ["Delhivery", "BlueDart", "Ekart", "DTDC", "XpressBees"]
SERVICES = MERCHANTS + BANKS + ["Paytm", "PhonePe", "GPay", "IRCTC", "Uber", "Ola", "Netflix", "Hotstar"]


# ─────────────────────────────────────────────
# Noise injection — simulates real SMS messiness
# ─────────────────────────────────────────────
def add_noise(text):
    ops = [
        lambda t: t.lower(),
        lambda t: t.upper(),
        lambda t: t.replace("your", "ur").replace("You", "U"),
        lambda t: re.sub(r"\.(?!\d)", "", t),                  # strip periods (not decimals)
        lambda t: t.replace("Rs.", "INR ").replace("Rs.", "₹"),
        lambda t: t + random.choice([" T&C apply", " -TM", " STOP to opt out", ""]),
        lambda t: "  " + t,                                    # leading whitespace
        lambda t: t.replace(" ", "  ", 1),                     # double space
        lambda t: t,   # unchanged — weighted so most rows stay clean
        lambda t: t,
        lambda t: t,
        lambda t: t,
    ]
    return random.choice(ops)(text)


# ─────────────────────────────────────────────
# OTP — includes formats WITHOUT the word "OTP"
# ─────────────────────────────────────────────
def gen_otp(n):
    templates = [
        "{otp} is your OTP for {service} login. Valid for {mins} minutes. Do not share with anyone.",
        "Your OTP is {otp}. Use it to verify your {service} account. Expires in {mins} min.",
        "OTP: {otp} for txn of Rs.{amt} at {service}. Do not share. -{bank}",
        "{otp} is your verification code for {service}. Never share your OTP.",
        "Use {otp} to complete your {service} registration. Valid till {mins} mins.",
        "Your one time password is {otp} for {service}. Please do not share it.",
        "{service}: {otp} is your login OTP. It expires in {mins} minutes.",
        # No "OTP" keyword — forces model beyond keyword matching
        "{otp} - use this code to sign in to {service}. Never share it with anyone.",
        "Your {service} code: {otp}",
        "{otp} is your {service} security code. Anyone asking for it is a scammer.",
        "Enter {otp} to verify your mobile number for {service}.",
        "Confirmation code {otp} for {service}. Keep it private.",
        "G-{otp} is your Google verification code.",
        "<#> {otp} is your {service} code. Valid {mins} min. hA8sk2Lqp3",
    ]
    rows = []
    # for _ in range(n):
    #     t = random.choice(templates)
    #     rows.append((add_noise(t.format(
    #         otp=random.randint(1000, 999999),
    #         service=random.choice(SERVICES),
    #         mins=random.choice([2, 5, 10, 15, 30]),
    #         amt=random.randint(100, 50000),
    #         bank=random.choice(BANKS),
    #     )), "OTP"))
    # return rows
    for _ in range(n):
        idx = random.randrange(len(templates))      # ← pick index instead
        t = templates[idx]                           # ← get template by index
        rows.append((add_noise(t.format(
            otp=random.randint(1000, 999999),
            service=random.choice(SERVICES),
            mins=random.choice([2, 5, 10, 15, 30]),
            amt=random.randint(100, 50000),
            bank=random.choice(BANKS),
        )), "OTP", f"OTP_{idx}"))                    # ← add template_id
    return rows


# ─────────────────────────────────────────────
# Bank — transactional alerts
# ─────────────────────────────────────────────
def gen_bank(n):
    templates = [
        "Rs.{amt} debited from A/c XX{acc} on {date} to {name}. Avl Bal: Rs.{bal}. -{bank}",
        "Rs.{amt} credited to A/c XX{acc} on {date}. Avl Bal: Rs.{bal}. -{bank}",
        "Your A/c XX{acc} is debited with Rs.{amt} on {date}. Info: UPI-{name}. Bal: Rs.{bal}",
        "ALERT: Rs.{amt} withdrawn from ATM using card XX{acc} on {date}. Bal: Rs.{bal}. -{bank}",
        "EMI of Rs.{amt} due on {date} for loan A/c XX{acc}. Pay now to avoid charges. -{bank}",
        "Your credit card XX{acc} statement is ready. Total due: Rs.{amt}. Min due: Rs.{mindue}. -{bank}",
        "UPI payment of Rs.{amt} to {name} successful. UPI Ref: {ref}. -{bank}",
        "Salary of Rs.{amt} credited to A/c XX{acc}. Avl Bal: Rs.{bal}. -{bank}",
        "Cheque no. {ref} for Rs.{amt} has been cleared from A/c XX{acc}. -{bank}",
        "Interest of Rs.{amt} credited to your FD A/c XX{acc}. -{bank}",
        "Low balance alert: A/c XX{acc} balance is Rs.{bal}. Maintain min balance to avoid charges.",
    ]
    rows = []
    # for _ in range(n):
    #     idx = random.randrange(len(templates))      # ← pick index instead
    #     rows.append((add_noise(t.format(
    #         amt=random.randint(50, 99999),
    #         acc=random.randint(1000, 9999),
    #         date=fake.date_this_year().strftime("%d-%m-%y"),
    #         name=fake.first_name(),
    #         bal=random.randint(1000, 500000),
    #         bank=random.choice(BANKS),
    #         mindue=random.randint(500, 5000),
    #         ref=random.randint(10**11, 10**12 - 1),
    #     )), "Bank"))
    # return rows
    for _ in range(n):
        idx = random.randrange(len(templates))
        t = templates[idx]                           # ← you missed this line
        rows.append((add_noise(t.format(
            amt=random.randint(50, 99999),
            acc=random.randint(1000, 9999),
            date=fake.date_this_year().strftime("%d-%m-%y"),
            name=fake.first_name(),
            bal=random.randint(1000, 500000),
            bank=random.choice(BANKS),
            mindue=random.randint(500, 5000),
            ref=random.randint(10**11, 10**12 - 1),
        )), "Bank", f"Bank_{idx}"))                  # ← and this
    return rows


# ─────────────────────────────────────────────
# Promo — marketing / offers
# ─────────────────────────────────────────────
def gen_promo(n):
    templates = [
        "MEGA SALE! Get {disc}% OFF on all products at {merchant}. Shop now: {url} T&C apply.",
        "{merchant} Big Billion Days! Up to {disc}% off + extra 10% with {bank} cards. Hurry!",
        "Flat Rs.{amt} cashback on your next order at {merchant}. Use code SAVE{code}. Valid till {date}.",
        "Exclusive for you! Buy 1 Get 1 FREE at {merchant}. Limited period offer. Visit {url}",
        "{merchant}: Your cart misses you! Complete purchase now & get {disc}% off. {url}",
        "Recharge with Rs.{amt} & get {disc}% extra talktime. Offer valid today only!",
        "Weekend special at {merchant}! Min {disc}% off on everything. Don't miss out: {url}",
        "Hi {name}, unlock Rs.{amt} off your first order at {merchant} with code NEW{code}.",
        "Last day! {merchant} clearance sale ends tonight. Up to {disc}% off sitewide.",
        "Your {merchant} membership expires soon. Renew now & save {disc}%: {url}",
    ]
    rows = []
    # for _ in range(n):
    #     t = random.choice(templates)
    #     rows.append((add_noise(t.format(
    #         disc=random.choice([10, 20, 30, 40, 50, 60, 70, 80]),
    #         merchant=random.choice(MERCHANTS),
    #         url="bit.ly/" + fake.lexify("??????"),
    #         bank=random.choice(BANKS),
    #         amt=random.randint(50, 2000),
    #         code=random.randint(10, 99),
    #         date=fake.date_this_month().strftime("%d %b"),
    #         name=fake.first_name(),
    #     )), "Promo"))
    # return rows
    rows = []
    for _ in range(n):
        idx = random.randrange(len(templates))
        t = templates[idx]
        rows.append((add_noise(t.format(
            disc=random.choice([10, 20, 30, 40, 50, 60, 70, 80]),
            merchant=random.choice(MERCHANTS),
            url="bit.ly/" + fake.lexify("??????"),
            bank=random.choice(BANKS),
            amt=random.randint(50, 2000),
            code=random.randint(10, 99),
            date=fake.date_this_month().strftime("%d %b"),
            name=fake.first_name(),
        )), "Promo", f"Promo_{idx}"))
    return rows


# ─────────────────────────────────────────────
# Delivery — shipment updates
# ─────────────────────────────────────────────
def gen_delivery(n):
    templates = [
        "Your {merchant} order {oid} has been shipped via {courier}. Track: {url}",
        "Out for delivery: Your {merchant} package {oid} will arrive today by {time}. -{courier}",
        "Delivered! Your {merchant} order {oid} was delivered on {date}. Rate your experience: {url}",
        "Your order {oid} from {merchant} is arriving tomorrow. Keep Rs.{amt} ready for COD.",
        "{courier}: Shipment {oid} reached your city hub. Expected delivery: {date}.",
        "Delivery attempt failed for order {oid}. We will retry tomorrow. -{courier}",
        "{name} from {courier} is arriving with your package. Contact: {phone}",
        "Your return pickup for order {oid} is scheduled on {date}. Keep the item ready. -{merchant}",
        "Order {oid} packed and ready! Expected dispatch by {date}. -{merchant}",
        "OTP for delivery of order {oid} is {otp}. Share only with the delivery agent. -{courier}",
    ]
    rows = []
    # for _ in range(n):
    #     t = random.choice(templates)
    #     rows.append((add_noise(t.format(
    #         merchant=random.choice(MERCHANTS),
    #         oid="OD" + str(random.randint(10**9, 10**10 - 1)),
    #         courier=random.choice(COURIERS),
    #         url="bit.ly/" + fake.lexify("??????"),
    #         time=random.choice(["12 PM", "3 PM", "6 PM", "9 PM"]),
    #         date=fake.date_this_month().strftime("%d %b"),
    #         amt=random.randint(200, 5000),
    #         name=fake.first_name(),
    #         phone=fake.phone_number(),
    #         otp=random.randint(1000, 9999),
    #     )), "Delivery"))
    # return rows
    for _ in range(n):
        idx = random.randrange(len(templates))
        t = templates[idx]
        rows.append((add_noise(t.format(
            merchant=random.choice(MERCHANTS),
            oid="OD" + str(random.randint(10**9, 10**10 - 1)),
            courier=random.choice(COURIERS),
            url="bit.ly/" + fake.lexify("??????"),
            time=random.choice(["12 PM", "3 PM", "6 PM", "9 PM"]),
            date=fake.date_this_month().strftime("%d %b"),
            amt=random.randint(200, 5000),
            name=fake.first_name(),
            phone=fake.phone_number(),
            otp=random.randint(1000, 9999),
        )), "Delivery", f"Delivery_{idx}"))
    return rows


# ─────────────────────────────────────────────
# Hard cases — designed to break keyword rules
# ─────────────────────────────────────────────
def gen_hard_cases(n):
    templates = [
        # digits + "code" but Promo
        ("Use code {code4} at checkout for {disc}% off at {merchant}!", "Promo"),
        ("Coupon {code4} gives you free delivery on orders above Rs.{amt}. -{merchant}", "Promo"),
        # mentions OTP but is Bank
        ("OTP-based login was enabled for your A/c XX{acc}. Call {bank} if this wasn't you.", "Bank"),
        ("Never share your OTP, PIN or CVV. {bank} never asks for these. Stay safe.", "Bank"),
        # Personal containing numbers
        ("Hey, my new number is {phone}. Save it! Meet at {time}?", "Personal"),
        ("Bro send me Rs.{amt} on gpay, will return by {date}", "Personal"),
        ("Class shifted to room {code4}, come fast", "Personal"),
        # OTP without keyword
        ("{code6} - use this to sign in. Never share this code with anyone.", "OTP"),
        ("Your Uber code: {code4}", "OTP"),
        ("Tap to verify: {code6}. This code expires shortly.", "OTP"),
        # Delivery mentioning payment
        ("Pay Rs.{amt} on delivery for order {oid}. -{courier}", "Delivery"),
        # Spam mimicking bank / offers
        ("Dear customer ur {bank} account will be blocked! Update KYC now: {url}", "Spam"),
        ("Congratulations! You won Rs.{bigamt} in lucky draw. Claim: {url}", "Spam"),
        ("Your SIM will be deactivated in 24hrs. Verify Aadhaar: {url}", "Spam"),
        ("Work from home! Earn Rs.{bigamt}/month. Join: {url}", "Spam"),
    ]
    rows = []
    for _ in range(n):
        idx = random.randrange(len(templates))
        t, label = templates[idx]
        rows.append((add_noise(t.format(
            code4=random.randint(1000, 9999),
            code6=random.randint(100000, 999999),
            disc=random.choice([10, 25, 50]),
            merchant=random.choice(MERCHANTS),
            acc=random.randint(1000, 9999),
            bank=random.choice(BANKS),
            phone=fake.phone_number(),
            time=random.choice(["6pm", "noon", "8", "tonight"]),
            amt=random.randint(200, 5000),
            bigamt=random.randint(10000, 2500000),
            oid="OD" + str(random.randint(10**8, 10**9)),
            courier=random.choice(COURIERS),
            url="bit.ly/" + fake.lexify("??????"),
            date=fake.date_this_month().strftime("%d %b"),
        )), label, f"Hard_{idx}"))
    return rows


if __name__ == "__main__":
    data = []
    data += gen_otp(2000)
    data += gen_bank(2000)
    data += gen_promo(1500)
    data += gen_delivery(1500)
    data += gen_hard_cases(1500)

    random.shuffle(data)

    with open("data/processed/synthetic_sms.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label","template_id"])
        writer.writerows(data)

    print(f"Generated {len(data)} synthetic SMS")
    from collections import Counter
    print(Counter(label for _, label,_ in data))