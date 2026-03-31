# 🔬 SimuLink

**Logiciel open source de génération et de transfert de résultats de laboratoire simulés.**

Développé au sein d'**iLumens**, le centre de simulation en santé de l'Université Paris Cité, SimuLink est un outil conçu pour enrichir les séances de simulation médicale. Il permet aux formateurs de générer en quelques clics des résultats d'examens biologiques réalistes (bilans sanguins, NFS, ionogrammes…) sous forme de rapports PDF, puis de les transmettre instantanément aux apprenants via le réseau local.

---

## 🎯 Pourquoi SimuLink ?

En simulation médicale, le réalisme est essentiel. Les apprenants doivent pouvoir recevoir et interpréter des résultats de laboratoire comme ils le feraient en situation réelle — au bon moment, dans un format crédible.

Avant SimuLink, ces résultats étaient souvent distribués sur papier, préparés à l'avance, sans possibilité de les adapter en temps réel au scénario en cours. SimuLink change ça :

- **Le formateur** remplit un formulaire depuis l'application mobile, personnalise les valeurs biologiques selon le scénario clinique, et génère un PDF en un clic.
- **L'apprenant** reçoit le résultat en temps réel sur son appareil, comme s'il venait du laboratoire de l'hôpital.
- **Le scénario** gagne en réalisme et en fluidité, sans interruption ni papier.

---

## ✨ Fonctionnalités

- 📄 Génération de rapports PDF réalistes (NFS, ionogramme, bilan hépatique…)
- 📡 Transfert instantané sur le réseau local via un serveur Flask
- 📱 Application mobile cross-platform (iOS / Android) via Expo
- 🎛️ Interface formateur intuitive pour paramétrer chaque résultat
- 📥 Réception en temps réel côté apprenant
- 🔓 100% open source — adaptez-le à vos besoins

---

## 🚀 Installation & Lancement

L'installation est simple. Clonez, installez, lancez.

### Prérequis

- Node.js `≥ 16` · npm `≥ 8`
- Python `≥ 3.8` · pip
- Git
- [Expo Go](https://expo.dev/client) sur votre téléphone

### Installation

```bash
# Cloner le projet
git clone https://github.com/021user/SimuLink.git
cd SimuLink

# Installer les dépendances front
npm install

# Installer les dépendances back
cd backend
pip install -r requirements.txt
```

### Configuration réseau

Renseignez l'adresse IP de votre machine dans les fichiers `app/(tabs)/explore.tsx` et `app/(tabs)/index.tsx` :

```typescript
const SERVER_IP = '192.168.1.42'; // Remplacez par votre IPv4 locale
```

> **Trouver son IPv4 :**
> - Windows → `ipconfig | findstr IPv4`
> - macOS / Linux → `ifconfig | grep inet`

### Lancement

```bash
# Terminal 1 — Démarrer le serveur
cd backend
python server.py

# Terminal 2 — Démarrer l'application
cd SimuLink
npx expo start -c
```

Scannez le QR code affiché avec l'application Expo Go sur votre téléphone. C'est prêt.

---

## 🗂️ Structure du projet

```
SimuLink/
├── backend/
│   ├── server.py              # Serveur API Flask
│   ├── requirements.txt       # Dépendances Python
│   └── output/                # Dossier des PDFs générés
├── app/
│   └── (tabs)/
│       ├── index.tsx           # Interface Formateur
│       └── explore.tsx         # Interface Apprenant
├── package.json
└── README.md
```

---

## 🧪 Utilisation

### Côté Formateur

1. Ouvrez l'application et accédez à l'onglet **Formateur**
2. Sélectionnez le type d'examen (NFS, ionogramme…)
3. Remplissez les valeurs biologiques selon votre scénario clinique
4. Cliquez sur **Générer** — le PDF est créé dans `backend/output/`
5. Activez **Publier** pour l'envoyer aux apprenants

### Côté Apprenant

1. Ouvrez l'application et accédez à l'onglet **Réception**
2. Les résultats publiés par le formateur apparaissent en temps réel
3. Consultez le PDF directement depuis l'application

---

## 🏛️ Contexte de développement

SimuLink a été développé au sein d'**iLumens**, le centre de simulation en santé de l'**Université Paris Cité**. Ce projet est né du besoin concret des formateurs de disposer d'un outil numérique simple et flexible pour intégrer des résultats biologiques réalistes dans leurs scénarios de simulation.

Le projet est **open source** : vous êtes libres de l'utiliser, le modifier et le redistribuer. Si vous l'utilisez dans votre centre de simulation, n'hésitez pas à nous le faire savoir !

---

## 👥 Contributeurs

- **Iyad Guesba**
- **Kirankumar Kichenassamy**

---

## 📝 Licence

Ce projet est open source. Le choix de la licence est en cours de finalisation. En attendant, vous êtes libre de consulter, utiliser et contribuer au code.

---

> *SimuLink — Développé chez iLumens, Université Paris Cité.*
