from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import datetime
import fpdf

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

PDF_DIR = "./pdfs"
if not os.path.exists(PDF_DIR):
    os.makedirs(PDF_DIR)

devices = []  # Liste des appareils connectés (à mettre à jour dynamiquement)

@app.route("/generate-pdf", methods=["POST"])
def generate_pdf():
    data = request.json
    name = data.get("name", "Inconnu")
    date = data.get("date", str(datetime.date.today()))
    analysis = data.get("analysis", "Aucune analyse fournie")

    filename = f"{name.replace(' ', '_')}_{date}.pdf"
    filepath = os.path.join(PDF_DIR, filename)

    pdf = fpdf.FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt=f"Rapport Médical de {name}", ln=True, align='C')
    pdf.ln(10)
    pdf.cell(200, 10, txt=f"Date: {date}", ln=True, align='L')
    pdf.ln(10)
    pdf.multi_cell(0, 10, txt=f"Analyse: {analysis}")
    pdf.output(filepath)

    socketio.emit("new-pdf", {"filename": filename})
    return jsonify({"filename": filename})

@app.route("/list-pdfs", methods=["GET"])
def list_pdfs():
    files = os.listdir(PDF_DIR)
    pdf_files = [f for f in files if f.endswith(".pdf")]
    return jsonify(pdf_files)

@app.route("/send-pdf", methods=["POST"])
def send_pdf():
    data = request.json
    filename = data.get("filename")
    remote_ip = data.get("remote_ip")

    if not filename or not remote_ip:
        return jsonify({"error": "Fichier ou IP non spécifié"}), 400

    filepath = os.path.join(PDF_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Fichier introuvable"}), 404

    # Simuler l'envoi (dans une vraie application, il faudrait un protocole de transfert)
    socketio.emit("pdf-received", {"filename": filename}, room=remote_ip)
    return jsonify({"message": f"PDF {filename} envoyé à {remote_ip}"})

@app.route("/devices", methods=["GET"])
def get_devices():
    return jsonify(devices)

@socketio.on("connect")
def handle_connect():
    remote_ip = request.remote_addr
    if remote_ip not in devices:
        devices.append(remote_ip)
    socketio.emit("devices", devices)
    print(f"Nouvel appareil connecté: {remote_ip}")

@socketio.on("disconnect")
def handle_disconnect():
    remote_ip = request.remote_addr
    if remote_ip in devices:
        devices.remove(remote_ip)
    socketio.emit("devices", devices)
    print(f"Appareil déconnecté: {remote_ip}")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
