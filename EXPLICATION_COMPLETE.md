# Explication complète du projet EDUFORALL

Ce document explique le code source du projet EDUFORALL (PHP + JS + CSS + SQLite/MySQL fallback). Il décrit les fichiers principaux, les fonctions clés, leur rôle, les routes API, les flux AJAX et des remarques de sécurité / déploiement.

---

## Instructions rapides pour lancer
- Depuis le dossier du projet :

```bash
php -S localhost:8000
```
- Ouvrir `http://localhost:8000` dans le navigateur.
- Comptes de test (seed) :
  - Promoteur : `admin@eduforall.com` / `password`
  - Enseignant : `teacher@eduforall.com` / `password`
  - Étudiant : `student@eduforall.com` / `password`

---

## Structure des fichiers (survol)
- `index.php` : page d'accueil + modales `login`/`signup` (frontend minimal pour s'authentifier).
- `dashboard.php` : interface protégée utilisateur (SPA partielle) consommant `api.php` via AJAX.
- `auth.php` : endpoints d'authentification (`signup`, `login`, `check`, `logout`).
- `api.php` : backend AJAX central (toutes les actions via `?action=...`) — cœur fonctionnel.
- `db.php` : gestion de la connexion PDO avec fallback automatique MySQL → SQLite + initialisation (`schema.sql` + seed).
- `diag.php`, `diag2.php` : scripts diagnostics (infos PHP/DB).
- `schema.sql` : schéma SQL relationnel (tables et relations).
- `assets/js/app.js` : logique client (`App`), navigation, appels AJAX.
- `assets/js/components.js` : rendus HTML réutilisables côté client.
- `assets/css/style.css` : styles, thème.

---

## Détail des composants serveur

### `db.php`
- Classe `DB` (singleton) :
  - Essaie d'abord de se connecter à MySQL (crée la DB si nécessaire), sinon passe à SQLite (`eduforall.db`).
  - `getConnection()` retourne l'objet PDO.
  - `getDbType()` retourne `'mysql'` ou `'sqlite'`.
  - `initializeSqliteDatabase()` : convertit le SQL de `schema.sql` pour SQLite et exécute les requêtes, puis appelle `seedDatabase()`.
  - `seedDatabase()` : insère des données de test (utilisateurs, matières, modules, cours, leçons, évaluations, questions).
- Rôle : permettre un démarrage immédiat sans configuration de base de données.

### `auth.php`
- Routes (via `?action=`) :
  - `signup` (POST) : validations, `password_hash()`, INSERT `users`.
  - `login` (POST) : vérifie email + `password_verify()`, crée `$_SESSION` (`user_id`, `user_name`, `user_email`, `user_role`).
  - `check` (GET) : retourne l'état d'authentification et informations utilisateur.
  - `logout` (GET) : détruit la session.
- Format des réponses : JSON.

### `api.php` (vue d'ensemble)
- Vérifie la session (si pas connecté, renvoie JSON non autorisé).
- `handleFileUpload($fileField, $targetSubfolder)` : gère les uploads, nettoie noms, crée répertoire `uploads/<sub>` et renvoie le chemin relatif.
- Dispatcher `switch ($action)` — actions principales :
  - Dashboard : `get_dashboard_stats` (renvoie données adaptées au rôle).
  - Matières : `get_subjects`, `add_subject` (restreint au promoteur).
  - Modules : `get_modules`, `add_module`, `validate_module_certificate` (logique de validation de module & émission de certificat si moyenne normalisée ≥ 12/20).
  - Cours & Leçons : `get_courses`, `add_course` (teacher), `get_course_details`, `add_lesson` (teacher), `complete_lesson` (student).
  - Évaluations : `add_evaluation` (teacher), `add_quiz_question`, `get_quiz_questions`, `submit_quiz` (student), `submit_homework` (student), `get_submissions_for_grading`, `grade_submission` (teacher).
  - Rapports/Notes : `get_student_grades`, `get_promoter_grades_overview`.
  - Messagerie : `get_messages`, `send_message`.
  - Utilitaires : `get_all_users`, `get_calendar_events`.
- Erreurs gérées par try/catch et renvoi JSON.

Remarques techniques :
- La plupart des accès DB utilisent des requêtes préparées (`prepare` + `execute`) — protège contre injections SQL.
- Quelques différences MySQL/SQLite gérées manuellement (`INSERT IGNORE` vs `INSERT OR IGNORE`).
- Uploads : pas de vérification stricte du type MIME ni de taille — attention en production.

---

## Frontend (JS)

### `assets/js/app.js` — objet `App`
- Rôle : contrôleur client, gestion de l'UI, appels AJAX vers `auth.php` et `api.php`.
- Initialisation : `App.init()` → `checkSession()` puis `setupEventListeners()`.
- Navigation : `switchTab(tabId)` active les vues et appelle `loadTabData(tabId)`.
- Principales méthodes et correspondance avec API :
  - `checkSession()` → `auth.php?action=check` (redirige si nécessaire).
  - `loadDashboardStats()` → `api.php?action=get_dashboard_stats` (affiche cards selon rôle).
  - `loadCoursesList()` / `loadRecentCoursesForStudent()` → `api.php?action=get_courses`.
  - `viewCourse(courseId)` → appelle `get_course_details` puis rend le listing des leçons.
  - `openLessonContent(lessonId)` → récupère details du cours puis `renderLessonResource(lesson)`.
  - `createCourse(e)` → POST FormData → `api.php?action=add_course`.
  - `createLesson(e, courseId)` → FormData (avec fichier) → `api.php?action=add_lesson`.
  - `createEvaluation(e, lessonId)` → `api.php?action=add_evaluation`.
  - `addQuizQuestion(e, evalId)` → `api.php?action=add_quiz_question`.
  - `startQuiz(evalId)` → `get_quiz_questions` puis `submitQuizAnswers()` envoie JSON à `submit_quiz`.
  - `submitHomework(e, evalId)` → `api.php?action=submit_homework` (FormData file).
  - `loadSubmissionsForGrading()` / `submitGrade()` → `get_submissions_for_grading` / `grade_submission`.
  - `createSubject`, `createModule` → `api.php?action=add_subject` / `add_module`.
  - `validateModule(moduleId)` → `api.php?action=validate_module_certificate`.
  - Messagerie : `loadMessagesInbox()` / `sendMessage()` → `get_messages` / `send_message`.

### `assets/js/components.js`
- Composants de rendu HTML réutilisables (cards, listes, formulaires générés dynamiquement) :
  - `renderCourseCard`, `renderLessonRow`, `renderEvaluationSection`, `renderQuizForm`, `renderMessageItem`, `renderGradingRow`, `renderCertificatePreview`.
- Helpers globaux client : `escapeHtml(str)` et `formatDate(dateStr)`.

---

## Schéma et logique métier
- Tables clés : `users`, `subjects`, `modules`, `module_subjects`, `courses`, `lessons`, `evaluations`, `quiz_questions`, `submissions`, `student_progress`, `certificates`, `messages`.
- Validation d'un module : pour chaque matière du module, l'étudiant doit avoir toutes les évaluations notées et une moyenne normalisée >= 12/20. Si OK, création d'un `certificate` avec `hash_code`.
- Quiz : réponses notées automatiquement ; résultat normalisé et insertion en `submissions` avec `status = 'graded'`.
- Devoirs : upload + status `pending` pour correction manuelle par enseignant.

---

## Sécurité & améliorations recommandées
- Valider MIME type et taille des fichiers dans `handleFileUpload`.
- Ajouter protections CSRF (tokens) pour formulaires sensibles.
- Limiter les extensions et appliquer scan antivirus si production.
- Utiliser HTTPS/headers sécurisés en production.
- Renforcer la gestion des erreurs (ne pas silencer `error_reporting(0)` en dev).
- Verrouiller l'accès aux endpoints sensibles côté serveur (vérifications de rôle déjà présentes sur de nombreuses routes).

---

## Endpoints API principaux (référence rapide)
- `auth.php?action=signup` (POST) — `name,email,password,role` (FormData ou JSON)
- `auth.php?action=login`  (POST) — `email,password`
- `auth.php?action=check`  (GET)
- `auth.php?action=logout` (GET)

- `api.php?action=get_dashboard_stats` (GET)
- `api.php?action=get_subjects` (GET)
- `api.php?action=add_subject` (POST) — promoter
- `api.php?action=get_modules` (GET)
- `api.php?action=add_module` (POST) — promoter
- `api.php?action=validate_module_certificate` (POST)
- `api.php?action=get_courses` (GET)
- `api.php?action=add_course` (POST) — teacher
- `api.php?action=get_course_details&course_id=...` (GET)
- `api.php?action=add_lesson` (POST, FormData) — teacher
- `api.php?action=complete_lesson` (POST) — student
- `api.php?action=add_evaluation` (POST) — teacher
- `api.php?action=add_quiz_question` (POST) — teacher
- `api.php?action=get_quiz_questions&evaluation_id=...` (GET)
- `api.php?action=submit_quiz` (POST JSON)
- `api.php?action=submit_homework` (POST FormData)
- `api.php?action=get_submissions_for_grading` (GET) — teacher
- `api.php?action=grade_submission` (POST) — teacher
- `api.php?action=get_student_grades` (GET)
- `api.php?action=get_messages` (GET), `api.php?action=send_message` (POST)
- `api.php?action=get_calendar_events` (GET)

---

## Où j'ai ajouté ce document
- Fichier créé : `EXPLICATION_COMPLETE.md` ([EXPLICATION_COMPLETE.md](EXPLICATION_COMPLETE.md)).

---

Si vous voulez :
- Je peux générer une version PDF imprimable du document.
- Ou créer une version plus détaillée pour chaque fonction (avec extrait de code et numéros de ligne). Dites-moi le format préféré (PDF / Markdown détaillé / Word).