# SimuLink

**Logiciel de génération et de transfert de résultats de laboratoire**

---

## Table des matières

- [Description](#description)  
- [Prérequis](#prérequis)  
- [Installation](#installation)  
- [Configuration](#configuration)  
- [Lancement](#lancement)  
  - [Serveur Python](#serveur-python)  
  - [Application mobile](#application-mobile)  
- [Structure du projet](#structure-du-projet)  
- [Exemples concrets](#exemples-concrets)  
- [Contributeurs](#contributeurs)  
- [Licence](#licence)  

---

## Description

SimuLink est un outil léger qui permet à des formateurs de générer des rapports PDF simulés et de les publier instantanément sur le réseau local pour les apprenants.

---

## Prérequis

- **Node.js** ≥ 16.x  
- **npm** ≥ 8.x  
- **Python** ≥ 3.8  
- **pip**  
- **Git**

> **Vérification :**  
> ```bash
> node -v    # ex. v18.16.0  
> npm -v     # ex. 9.5.1  
> python --version  # ex. Python 3.11.2  
> ```

---

## Installation

1. **Cloner le dépôt**  
   ```bash
   git clone https://github.com/021user/SimuLink.git
   cd SimuLink
   git checkout VersionFinal
```

2. **Nettoyer d’anciennes dépendances**

   ```bash
   rm -rf node_modules package-lock.json
   ```

3. **Installer les dépendances JavaScript**

   ```bash
   npm install
   ```

4. **Installer les dépendances Python**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

---

## Configuration

Dans les fichiers `app/(tabs)/explore.tsx` et `app/(tabs)/index.tsx`, ajuster l’adresse IP du serveur :

```typescript
// Exemple dans explore.tsx
const SERVER_IP = '192.168.1.42'; // Remplacez par votre IPv4
```

> **Récupérer votre IPv4 :**
>
> * **Windows** : `ipconfig | findstr IPv4`
> * **macOS/Linux** : `ifconfig | grep inet`

---

## Lancement

### Serveur Python

```bash
cd backend
python server.py
```

> Si un module manque :
>
> ```bash
> pip install flask
> ```

### Application mobile

Ouvrir un autre terminal :

```bash
cd ../
npx expo start -c
```

* Scannez le QR code avec l’app Expo sur votre téléphone, ou lancez l’émulateur.

---

## Structure du projet

```
SimuLink/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── output/             # Rapports PDF générés
├── app/
│   ├── (tabs)/
│   │   ├── explore.tsx
│   │   └── index.tsx
│   └── assets/
├── README.md
└── package.json
```

---

## Exemples concrets

1. **Générer un rapport**

   ```bash
   # Dans l’interface Formateur :
   # Remplissez le formulaire “NFS” puis cliquez sur Générer
   ```

   Résultat : création de `Patient123_2025-05-08.pdf` dans `backend/output/`

2. **Publier un rapport**

   ```bash
   # Activez le switch “Publier” dans l’app Formateur
   ```

   Les apprenants voient immédiatement le PDF dans l’onglet Réception.

---

## Contributeurs

* Iyad GUESBA
* Kirankumar KICHENASSAMY

---

## Licence

Ce projet est sous **MIT License**.

```
```
