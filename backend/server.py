from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from flask_socketio import SocketIO
import os
import datetime
import json
import fpdf

app = Flask(__name__)
app.config['PROPAGATE_EXCEPTIONS'] = True
CORS(app, origins="*", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

BASE_DIR = "./backend/dossierpatient"
os.makedirs(BASE_DIR, exist_ok=True)

# ─── utilitaires ─────────────────────────────────────────

def parse_date(raw_date: str) -> str:
    try:
        fmt = '%d/%m/%Y' if '/' in raw_date else '%Y-%m-%d'
        dt = datetime.datetime.strptime(raw_date, fmt).date()
    except:
        dt = datetime.date.today()
    return dt.strftime('%d/%m/%Y')

def is_anomaly(val_str: str, ref_str: str) -> bool:
    try:
        v = float(val_str.replace(',', '.'))
    except:
        return False
    ref = ref_str.strip()
    if '-' in ref and not ref.startswith(('<','>')):
        lo, hi = [float(x.replace(',', '.')) for x in ref.split('-')]
        return not (lo <= v <= hi)
    if ref.startswith('<'):
        return v >= float(ref[1:].replace(',', '.'))
    if ref.startswith('>'):
        return v <= float(ref[1:].replace(',', '.'))
    return False

def load_publish_map(folder_path: str) -> dict:
    meta = os.path.join(folder_path, 'published.json')
    if os.path.exists(meta):
        with open(meta, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_publish_map(folder_path: str, m: dict):
    meta = os.path.join(folder_path, 'published.json')
    with open(meta, 'w', encoding='utf-8') as f:
        json.dump(m, f)

# ─────────────────────────────────────────────────────────

@app.route("/create-patient-folder", methods=["POST"])
def create_patient_folder():
    data = request.json or {}
    name = data.get("folder_name", "").strip()
    if not name:
        return jsonify(error="Le nom du dossier est requis"), 400
    path = os.path.join(BASE_DIR, name)
    if os.path.exists(path):
        return jsonify(error="Le dossier existe déjà"), 400
    os.makedirs(path, exist_ok=True)
    return jsonify(message=f"Dossier '{name}' créé avec succès")

@app.route("/list-patient-folders", methods=["GET"])
def list_patient_folders():
    folders = os.listdir(BASE_DIR)
    return jsonify(folders)

@app.route("/generate-pdf", methods=["POST"])
def generate_pdf():
    data           = request.json or {}
    display_name   = data.get("name", "Inconnu")
    file_name      = display_name.replace(" ", "_")
    date_rapport   = parse_date(data.get("date", ""))
    safe_date      = date_rapport.replace('/','-')
    analyses       = data.get("analyses", [])
    interpretation = data.get("interpretation", "")
    patient_folder = data.get("patient_folder", "")
    publish        = bool(data.get("publish", False))

    folder_path = os.path.join(BASE_DIR, patient_folder)
    if not os.path.isdir(folder_path):
        return jsonify(error="Le dossier patient n'existe pas"), 400

    pdf_filename = f"{file_name}_{safe_date}.pdf"
    pdf_path     = os.path.join(folder_path, pdf_filename)

    pdf = fpdf.FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    if os.path.exists("logo2.png"):
        pdf.image("logo2.png", x=10, y=10, w=30)
    if os.path.exists("logo.png"):
        pdf.image("logo.png",  x=170, y=10, w=30)
    pdf.set_y(50)

    pdf.set_font("Arial","B",14)
    pdf.cell(190,6,"CENTRE HOSPITALO-UNIVERSITAIRE ILUMENS",0,1,"C")
    pdf.cell(190,6,"SERVICE DE BIOCHIMIE",0,1,"C")

    pdf.ln(5)
    pdf.set_font("Arial","",12)
    pdf.cell(100,6,f"Nom : {display_name}",0,0,"L")
    pdf.cell(90,6,f"Date : {date_rapport}",0,1,"R")
    pdf.cell(190,6,"Numéro : 30282",0,1,"R")

    pdf.ln(3)
    pdf.set_draw_color(0,0,0); pdf.set_line_width(0.5)
    y = pdf.get_y(); pdf.line(10,y,200,y)
    pdf.ln(5)

    pdf.set_font("Arial","B",12)
    pdf.cell(190,8,"RÉSULTATS D'ANALYSES",0,1,"C")
    pdf.ln(2)
    col_w = [70,40,30,50]
    hdrs  = ["Paramètre","Val. Trouvée","Unité","Norme"]
    pdf.set_fill_color(20,20,210)
    pdf.set_text_color(255,255,255)
    pdf.set_font("Arial","B",11)
    for w,h in zip(col_w,hdrs):
        pdf.cell(w,8,h,1,0,"C",True)
    pdf.ln(8)

    pdf.set_font("Arial","",10)
    fill = False
    for a in analyses:
        param   = a.get("name","")
        val_str = a.get("value","")
        unite   = a.get("unit","") or "N/A"
        norme   = a.get("reference","") or "N/A"
        anomalie= is_anomaly(val_str,norme)

        if anomalie:
            pdf.set_text_color(255,0,0)
            disp = f"{val_str} !"
        else:
            pdf.set_text_color(0,0,0)
            disp = val_str

        pdf.set_fill_color(240,240,240 if fill else 255)
        pdf.cell(col_w[0],8,param, 1,0,"C",fill)
        pdf.cell(col_w[1],8,disp,  1,0,"C",fill)
        pdf.cell(col_w[2],8,unite, 1,0,"C",fill)
        pdf.cell(col_w[3],8,norme, 1,1,"C",fill)
        fill = not fill

    pdf.set_text_color(0,0,0)
    pdf.ln(5)
    pdf.set_font("Arial","B",12)
    pdf.cell(190,8,"INTERPRÉTATION",0,1,"L")
    pdf.set_font("Arial","",10)
    if interpretation.strip():
        pdf.multi_cell(190,6,interpretation)
    else:
        pdf.cell(190,6,"Aucune interprétation fournie.",0,1)

    pdf.ln(10)
    pdf.set_font("Arial","I",9)
    pdf.multi_cell(190,6,
        "Ouvert du lundi au vendredi - de 7H30 à 17H00\n"
        "et le samedi de 07H30 à 12H00",
        align="C"
    )
    pdf.ln(5)
    pdf.cell(190,6,"Signature",0,1,"R")

    pdf.output(pdf_path)

    pm = load_publish_map(folder_path)
    pm[pdf_filename] = publish
    save_publish_map(folder_path, pm)

    socketio.emit("new-pdf", {
        "patient_folder": patient_folder,
        "filename": pdf_filename,
        "publish": publish
    })

    return jsonify(message="PDF généré avec succès", pdf_filename=pdf_filename)

@app.route("/set-publish", methods=["POST", "OPTIONS"])
def set_publish():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response

    data = request.json or {}
    folder = data.get("patient_folder", "")
    filename = data.get("filename", "")
    publish = bool(data.get("publish", False))
    path = os.path.join(BASE_DIR, folder)
    if not os.path.isdir(path):
        return jsonify(error="Dossier introuvable"), 404
    pm = load_publish_map(path)
    pm[filename] = publish
    save_publish_map(path, pm)
    socketio.emit("new-pdf", {
        "patient_folder": folder,
        "filename": filename,
        "publish": publish
    })
    return jsonify(message="État de publication mis à jour")

@app.route("/list-pdfs-in-folder/<folder_name>", methods=["GET"])
def list_pdfs_in_folder(folder_name):
    path = os.path.join(BASE_DIR, folder_name)
    if not os.path.isdir(path):
        return jsonify(error="Dossier introuvable"), 404

    all_pdfs = [f for f in os.listdir(path) if f.lower().endswith(".pdf")]
    if request.args.get("published") == "true":
        pm = load_publish_map(path)
        all_pdfs = [f for f in all_pdfs if pm.get(f, False)]
    return jsonify(all_pdfs)

@app.route("/patients/<folder>/<filename>", methods=["GET"])
def serve_pdf(folder, filename):
    path = os.path.join(BASE_DIR, folder)
    if not os.path.isdir(path):
        return jsonify(error="Dossier introuvable"), 404
    return send_from_directory(path, filename)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
