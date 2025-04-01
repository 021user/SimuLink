from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import datetime
import fpdf

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

BASE_DIR = "./backend/dossierpatient"

if not os.path.exists(BASE_DIR):
    os.makedirs(BASE_DIR, exist_ok=True)

@app.route("/create-patient-folder", methods=["POST"])
def create_patient_folder():
    try:
        data = request.json
        folder_name = data.get("folder_name")
        if not folder_name:
            return jsonify({"error": "Le nom du dossier est requis"}), 400

        folder_path = os.path.join(BASE_DIR, folder_name)
        if os.path.exists(folder_path):
            return jsonify({"error": "Le dossier existe déjà"}), 400

        os.makedirs(folder_path, exist_ok=True)
        return jsonify({"message": f"Dossier '{folder_name}' créé avec succès"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/list-patient-folders", methods=["GET"])
def list_patient_folders():
    try:
        folders = os.listdir(BASE_DIR)
        return jsonify(folders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate-pdf", methods=["POST"])
def generate_pdf():
    try:
        data = request.json

        # Champs basiques
        name = data.get("name", "Inconnu").replace(" ", "_")
        date_rapport = data.get("date", str(datetime.date.today()))
        analyses = data.get("analyses", [])
        interpretation = data.get("interpretation", "")
        patient_folder = data.get("patient_folder", "")

        # Vérification de l'existence du dossier patient
        if not patient_folder:
            return jsonify({"error": "Le dossier patient est requis"}), 400

        patient_folder_path = os.path.join(BASE_DIR, patient_folder)
        if not os.path.exists(patient_folder_path):
            return jsonify({"error": "Le dossier patient n'existe pas"}), 400

        # Nom du PDF
        pdf_filename = f"{name}_{date_rapport}.pdf"
        pdf_path = os.path.join(patient_folder_path, pdf_filename)

        # Création du PDF avec fpdf
        pdf = fpdf.FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        # Logos (assurez-vous que les fichiers existent dans le même dossier)
        pdf.image("logo2.png", x=10, y=10, w=30)  # Logo à gauche
        pdf.image("logo.png", x=170, y=10, w=30)   # Logo à droite

        pdf.set_y(50)  # Décalage pour ne pas chevaucher les logos

        # En-tête principal
        pdf.set_font("Arial", "B", 14)
        pdf.cell(190, 6, "CENTRE HOSPITALO-UNIVERSITAIRE ILUMENS", 0, 1, "C")
        pdf.cell(190, 6, "SERVICE DE BIOCHIMIE", 0, 1, "C")

        # Informations patient
        pdf.ln(5)
        pdf.set_font("Arial", "", 12)
        pdf.cell(100, 6, f"Nom : {name}", 0, 0, "L")
        pdf.cell(90, 6, f"Date : {date_rapport}", 0, 1, "R")
        pdf.cell(190, 6, f"Numéro : 30282", 0, 1, "R")

        # Ligne de séparation
        pdf.ln(3)
        pdf.set_draw_color(0, 0, 0)
        pdf.set_line_width(0.5)
        current_y = pdf.get_y()
        pdf.line(10, current_y, 200, current_y)
        pdf.ln(5)

        # Titre du tableau
        pdf.set_font("Arial", "B", 12)
        pdf.cell(190, 8, "RÉSULTATS D'ANALYSES", 0, 1, "C")
        pdf.ln(2)

        # En-tête du tableau
        pdf.set_fill_color(20, 20, 210)  # Bleu
        pdf.set_text_color(255, 255, 255)  # Blanc
        pdf.set_font("Arial", "B", 11)

        # Colonnes : Paramètre, Val. Trouvée, Unité (largeur totale = 190)
        col_widths = [90, 50, 50]
        headers = ["Paramètre", "Val. Trouvée", "Unité"]
        for w, header in zip(col_widths, headers):
            pdf.cell(w, 8, header, 1, 0, "C", True)
        pdf.ln(8)

        # Contenu du tableau
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(0, 0, 0)  # Noir
        fill = False

        for analyse in analyses:
            if "name" in analyse:
                parametre = analyse.get("name", "")
                val_trouvee = analyse.get("value", "")
                unite = analyse.get("unit", "") or "N/A"
            else:
                parametre = analyse.get("parametre", "")
                val_trouvee = analyse.get("val_trouvee", "")
                unite = analyse.get("unite", "") or "N/A"

            # Alternance de la couleur de fond pour les lignes
            pdf.set_fill_color(240, 240, 240) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(col_widths[0], 8, parametre, 1, 0, "C", fill)
            pdf.cell(col_widths[1], 8, val_trouvee, 1, 0, "C", fill)
            pdf.cell(col_widths[2], 8, unite, 1, 1, "C", fill)
            fill = not fill

        # Section INTERPRÉTATION
        pdf.ln(5)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(190, 8, "INTERPRÉTATION", 0, 1, "L")
        pdf.set_font("Arial", "", 10)
        if interpretation.strip():
            pdf.multi_cell(190, 6, interpretation)
        else:
            pdf.cell(190, 6, "Aucune interprétation fournie.", 0, 1)

        # Note en bas de page
        pdf.ln(10)
        pdf.set_font("Arial", "I", 9)
        pdf.cell(190, 6, "Ouvert du lundi au vendredi - de 7H30 à 17H00 - et le samedi de 07H30 à 12H00", 0, 1, "C")

        # Signature
        pdf.ln(10)
        pdf.cell(190, 6, "Signature", 0, 1, "R")

        # Sauvegarde du PDF
        pdf.output(pdf_path)

        # Émission via SocketIO
        socketio.emit("new-pdf", {"filename": pdf_filename, "patient_folder": patient_folder})

        return jsonify({
            "message": "PDF généré avec succès",
            "pdf_filename": pdf_filename,
            "patient_folder": patient_folder
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/list-pdfs-in-folder/<folder_name>", methods=["GET"])
def list_pdfs_in_folder(folder_name):
    try:
        folder_path = os.path.join(BASE_DIR, folder_name)
        if not os.path.exists(folder_path):
            return jsonify({"error": "Dossier introuvable"}), 404

        pdfs = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]
        print("PDFs détectés dans le dossier", folder_name, ":", pdfs)  # Log pour débogage
        return jsonify(pdfs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route pour servir les fichiers PDF
@app.route("/patients/<folder>/<filename>", methods=["GET"])
def serve_pdf(folder, filename):
    try:
        folder_path = os.path.join(BASE_DIR, folder)
        if not os.path.exists(folder_path):
            return jsonify({"error": "Dossier introuvable"}), 404
        file_path = os.path.join(folder_path, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "Fichier PDF introuvable"}), 404
        return send_from_directory(folder_path, filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
