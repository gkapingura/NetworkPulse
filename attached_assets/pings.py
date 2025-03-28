import csv
import logging
import os
import smtplib
import schedule
import time
from datetime import datetime
from email.message import EmailMessage
from dotenv import load_dotenv
from ping3 import ping
import json

# Load environment variables from .env file
load_dotenv()

# Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
REPORT_RECIPIENT_EMAIL = os.getenv("REPORT_RECIPIENT_EMAIL")
ERROR_RECIPIENT_EMAIL = os.getenv("ERROR_RECIPIENT_EMAIL")

# Load IP addresses from JSON file
with open('ips.json', 'r') as f:
    ip_addresses = json.load(f)

# Configure logging
logging.basicConfig(filename='ping_script.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def ping_ips(ips, output_file, ping_count=5):
    """
    Ping a list of IP addresses and write the results to a CSV file.

    Parameters:
    - ips (list): List of dictionaries containing {"name": "hostname", "ip": "IP address"}
    - output_file (str): Path to the output CSV file
    - ping_count (int): Number of ping attempts per IP

    Returns:
    - bool: True if all IPs are unreachable, False otherwise
    """
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    all_unreachable = True

    with open(output_file, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Name", "IP Address", "Average Response Time (s)", "Time"])

        for entry in ips:
            name = entry["name"]
            ip = entry["ip"]
            latencies = []

            try:
                for _ in range(ping_count):
                    response_time = ping(ip)
                    if response_time is not None:
                        latencies.append(response_time)
                        all_unreachable = False
            except Exception as e:
                logging.error(f"Error pinging {name} ({ip}): {str(e)}")

            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if latencies:
                average_latency = sum(latencies) / len(latencies)
                logging.info(f"{name} ({ip}) average response time is {average_latency:.4f} seconds at {current_time}")
                writer.writerow([name, ip, f"{average_latency:.4f}", current_time])
            else:
                logging.warning(f"{name} ({ip}) is unreachable at {current_time}")
                writer.writerow([name, ip, "Unreachable", current_time])

    return all_unreachable

def send_email(subject, body, attachment_path, recipient):
    """
    Send an email with an optional attachment.

    Parameters:
    - subject (str): Email subject
    - body (str): Email body
    - attachment_path (str): Path to the attachment file
    - recipient (str): Email recipient
    """
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient
    msg.set_content(body)

    if attachment_path:
        with open(attachment_path, "rb") as f:
            file_data = f.read()
            file_name = os.path.basename(attachment_path)
            msg.add_attachment(file_data, maintype="application", subtype="octet-stream", filename=file_name)

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
            logging.info(f"Email sent to {recipient}")
    except Exception as e:
        logging.error(f"Failed to send email to {recipient}: {str(e)}")

def generate_report():
    """
    Generate and send a ping report.
    """
    output_file = f"C:/Users/kapingura/Documents/BHC/reports/BHC LINK REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    all_unreachable = ping_ips(ip_addresses, output_file)

    if all_unreachable:
        send_email(
            subject="Ping Report - Error",
            body="All IPs are unreachable or there is no internet access.",
            attachment_path=output_file,
            recipient=ERROR_RECIPIENT_EMAIL
        )
    else:
        send_email(
            subject="Network Status Report",
            body="Please find attached the latest network status report.",
            attachment_path=output_file,
            recipient=REPORT_RECIPIENT_EMAIL
        )

# Schedule the report generation every three hours
schedule.every(3).hours.do(generate_report)

if __name__ == "__main__":
    generate_report()  # Run immediately on startup
    while True:
        schedule.run_pending()
        time.sleep(1)
