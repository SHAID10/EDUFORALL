# EDUFORALL - Learning Management System (LMS)

**EDUFORALL** est un système de gestion de l'apprentissage (LMS) moderne, performant et élégant, conçu pour répondre aux besoins des étudiants, des enseignants et des promoteurs académiques. La plateforme est construite en utilisant **HTML, CSS, JavaScript, AJAX, PHP et MySQL/SQLite**.

---

## 🌟 Fonctionnalités Clés

### 👨‍🏫 Espace Enseignants
* **Création de cours** dans différentes matières.
* **Dépôt de ressources** (leçons sous forme de documents PDF ou de vidéos).
* **Création d'évaluations** à la fin de chaque leçon (Quiz interactifs à choix multiples ou devoirs pratiques).
* **Attribution des notes** et retours (feedback) sur les devoirs soumis par les étudiants.

### 🎓 Espace Étudiants
* **Consultation des cours** et téléchargement des leçons PDF ou lecture de leçons vidéo.
* **Soumission de devoirs** (texte et téléversement de fichiers ZIP/PDF) ou passage de **Quiz interactifs**.
* **Suivi de la progression (en %)** calculée automatiquement en fonction des leçons lues et des évaluations complétées.
* **Consultation des notes** et obtention des certificats académiques.

### 🏆 Espace Promoteurs (Administrateurs)
* **Création des matières académiques** (ex: INF132, INF122, MAT101).
* **Création de modules certifiants** regroupant plusieurs matières.
* **Attribution automatique de certificats de validation** pour les étudiants qui obtiennent une moyenne générale supérieure ou égale à **12/20** sur l'ensemble des évaluations du module.

---

## 🎨 Charte Graphique et Design
* **Nom de la plateforme** : EDUFORALL
* **Couleurs** : Alliance moderne d'Orange (#FF7A00), de Bleu de Prusse (#0A369D), de Blanc et de dégradés Gris ardoise.
* **Design** : Expérience utilisateur (UI/UX) premium et épurée utilisant les principes du *Glassmorphism*, des micro-animations interactives et des grilles fluides adaptatives (Responsive Design).

---

## 🚀 Lancement Rapide (Sans configuration de Base de Données)

Pour faciliter le test immédiat de l'application, celle-ci intègre un **mécanisme de repli automatique (fallback)**. Si MySQL n'est pas détecté ou n'est pas configuré, le système utilise automatiquement une base de données locale **SQLite** (`eduforall.db`) pré-configurée et déjà peuplée avec des données de test.

1. Ouvrez un terminal dans le dossier du projet.
2. Démarrez le serveur interne de PHP :
   ```bash
   php -S localhost:8000
   ```
3. Ouvrez votre navigateur et rendez-vous sur : `http://localhost:8000`

---

## 👤 Comptes de Test Pré-générés

Les comptes suivants ont été créés et pré-alimentés avec des cours, des leçons et des quiz :

| Rôle | Adresse Courriel | Mot de passe |
| :--- | :--- | :--- |
| **Promoteur / Admin** | `admin@eduforall.com` | `password` |
| **Enseignant** | `teacher@eduforall.com` | `password` |
| **Étudiant** | `student@eduforall.com` | `password` |

---

## ⚙️ Configuration MySQL (Optionnel)

Pour utiliser un serveur MySQL natif en production :
1. Créez une base de données nommée `eduforall_db`.
2. Importez le fichier `schema.sql` dans votre serveur MySQL.
3. Modifiez les constantes de connexion au début du fichier `db.php` si nécessaire :
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'votre_utilisateur');
   define('DB_PASS', 'votre_mot_de_passe');
   define('DB_NAME', 'eduforall_db');
   ```
