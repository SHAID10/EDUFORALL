<?php
// db.php - Database connection with automatic SQLite fallback for instant execution.

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'eduforall_db');

class DB {
    private static $instance = null;
    private $conn = null;
    private $dbType = 'mysql';

    private function __construct() {
        try {
            // Attempt standard MySQL connection
            $dsn = "mysql:host=" . DB_HOST . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            // First connect without DB name to check/create database
            $tempPdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            $tempPdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $tempPdo = null;

            // Connect to specific database
            $this->conn = new PDO($dsn . ";dbname=" . DB_NAME, DB_USER, DB_PASS, $options);
            $this->dbType = 'mysql';
        } catch (PDOException $e) {
            // Fallback to SQLite if MySQL fails
            $sqlitePath = __DIR__ . '/eduforall.db';
            $isNew = !file_exists($sqlitePath);
            
            try {
                $this->conn = new PDO("sqlite:" . $sqlitePath);
                $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                $this->dbType = 'sqlite';
                
                // Enable foreign key support in SQLite
                $this->conn->exec("PRAGMA foreign_keys = ON;");

                if ($isNew) {
                    $this->initializeSqliteDatabase();
                }
            } catch (PDOException $sqliteEx) {
                die("Database Connection Failed: MySQL and SQLite fallback both failed. " . $sqliteEx->getMessage());
            }
        }
    }

    public static function getConnection() {
        if (self::$instance === null) {
            self::$instance = new DB();
        }
        return self::$instance->conn;
    }

    public static function getDbType() {
        if (self::$instance === null) {
            self::$instance = new DB();
        }
        return self::$instance->dbType;
    }

    private function initializeSqliteDatabase() {
        $schemaPath = __DIR__ . '/schema.sql';
        if (!file_exists($schemaPath)) {
            return;
        }

        $sql = file_get_contents($schemaPath);
        
        // Remove comments
        $sql = preg_replace('/--.*/', '', $sql);
        
        // Convert MySQL statements to SQLite compatible statements
        $queries = explode(';', $sql);
        foreach ($queries as $query) {
            $query = trim($query);
            if (empty($query)) continue;
            
            // Skip database creation queries for SQLite
            if (stripos($query, 'CREATE DATABASE') !== false) continue;
            if (stripos($query, 'USE ') !== false) continue;
            
            // Translate MySQL-specific syntax to SQLite
            $query = preg_replace('/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $query);
            $query = preg_replace('/ENGINE\s*=\s*InnoDB/i', '', $query);
            $query = preg_replace('/CHARACTER\s+SET\s+\w+/i', '', $query);
            $query = preg_replace('/COLLATE\s+\w+/i', '', $query);
            $query = preg_replace('/ENUM\([^)]+\)/i', 'TEXT', $query);
            $query = preg_replace('/DECIMAL\(\d+,\s*\d+\)/i', 'NUMERIC', $query);
            
            try {
                $this->conn->exec($query);
            } catch (PDOException $e) {
                // Log or ignore errors for safety, or echo during debug
                error_log("SQLite init query error: " . $e->getMessage() . " in query: " . $query);
            }
        }

        // Insert initial Admin/Promoter, Teacher, and Student for testing
        $this->seedDatabase();
    }

    private function seedDatabase() {
        $pUsers = $this->conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        
        // Passwords hashed with BCRYPT (password is 'password' for all default accounts)
        $hashedPassword = password_hash('password', PASSWORD_BCRYPT);
        
        // Check if users already exist
        $check = $this->conn->query("SELECT COUNT(*) FROM users")->fetchColumn();
        if ($check > 0) return;

        // Create Users
        $pUsers->execute(['Prof Jean Dupont', 'teacher@eduforall.com', $hashedPassword, 'teacher']);
        $teacherId = $this->conn->lastInsertId();
        
        $pUsers->execute(['Marie Curie (Promoteur)', 'admin@eduforall.com', $hashedPassword, 'promoter']);
        $promoterId = $this->conn->lastInsertId();

        $pUsers->execute(['Alice Student', 'student@eduforall.com', $hashedPassword, 'student']);
        $studentId = $this->conn->lastInsertId();

        // Create Subjects
        $pSub = $this->conn->prepare("INSERT INTO subjects (id, name, description, created_by) VALUES (?, ?, ?, ?)");
        $pSub->execute(['INF132', 'Algorithmique & Structures de Données', 'Introduction aux structures de données et aux algorithmes en PHP et C.', $promoterId]);
        $pSub->execute(['INF122', 'Développement Web Dynamique', 'Conception d\'applications web en utilisant HTML, CSS, JavaScript, AJAX et PHP.', $promoterId]);
        $pSub->execute(['MAT101', 'Algèbre Linéaire', 'Notions de base en espaces vectoriels, matrices et systèmes d\'équations.', $promoterId]);

        // Create Modules
        $pMod = $this->conn->prepare("INSERT INTO modules (name, description) VALUES (?, ?)");
        $pMod->execute(['Certificat en Technologie Web & Programmation', 'Validez ce module en complétant et obtenant une moyenne supérieure à 12/20 dans les matières INF132 et INF122.']);
        $moduleId1 = $this->conn->lastInsertId();

        $pMod->execute(['Certificat en Mathématiques Appliquées', 'Validez ce module en complétant la matière MAT101.']);
        $moduleId2 = $this->conn->lastInsertId();

        // Connect Modules to Subjects
        $pModSub = $this->conn->prepare("INSERT INTO module_subjects (module_id, subject_id) VALUES (?, ?)");
        $pModSub->execute([$moduleId1, 'INF132']);
        $pModSub->execute([$moduleId1, 'INF122']);
        $pModSub->execute([$moduleId2, 'MAT101']);

        // Create Courses
        $pCourse = $this->conn->prepare("INSERT INTO courses (subject_id, teacher_id, title, description) VALUES (?, ?, ?, ?)");
        $pCourse->execute(['INF122', $teacherId, 'Développement Web moderne avec AJAX & PHP', 'Ce cours présente les bases du développement web côté serveur avec PHP, et la communication asynchrone avec AJAX.']);
        $courseId = $this->conn->lastInsertId();

        // Create Lessons
        $pLesson = $this->conn->prepare("INSERT INTO lessons (course_id, title, content_type, content_path, description, order_index) VALUES (?, ?, ?, ?, ?, ?)");
        $pLesson->execute([$courseId, 'Introduction à HTML5 et CSS3', 'pdf', 'resources/intro_html_css.pdf', 'Dans cette leçon, nous reverrons les bases de la structure HTML et du stylage CSS.', 1]);
        $lessonId1 = $this->conn->lastInsertId();

        $pLesson->execute([$courseId, 'Programmation Orientée Objet en PHP', 'video', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Cette leçon vidéo détaille les concepts de Classes, Objets et Héritage en PHP.', 2]);
        $lessonId2 = $this->conn->lastInsertId();

        $pLesson->execute([$courseId, 'Requêtes Asynchrones avec AJAX et Fetch API', 'pdf', 'resources/ajax_fetch_api.pdf', 'Comment interroger des API PHP sans recharger la page avec Fetch API.', 3]);
        $lessonId3 = $this->conn->lastInsertId();

        // Create Evaluations (Quizzes and Homeworks)
        $pEval = $this->conn->prepare("INSERT INTO evaluations (lesson_id, type, title, description, max_points) VALUES (?, ?, ?, ?, ?)");
        
        // Evaluation 1 (Quiz for Lesson 1)
        $pEval->execute([$lessonId1, 'quiz', 'Quiz : Bases HTML5/CSS3', 'Répondez aux questions sur la structure HTML et les sélecteurs CSS.', 20]);
        $evalId1 = $this->conn->lastInsertId();

        // Questions for Quiz 1
        $pQuest = $this->conn->prepare("INSERT INTO quiz_questions (evaluation_id, question_text, option_a, option_b, option_c, option_d, correct_option, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $pQuest->execute([$evalId1, 'Quelle balise HTML est utilisée pour définir le titre principal d\'un document ?', '<h6>', '<header>', '<h1>', '<title>', 'C', 10]);
        $pQuest->execute([$evalId1, 'Quelle propriété CSS est utilisée pour changer la couleur d\'arrière-plan ?', 'color', 'background-color', 'bg-color', 'border-color', 'B', 10]);

        // Evaluation 2 (Quiz for Lesson 2)
        $pEval->execute([$lessonId2, 'quiz', 'Quiz : PHP Orienté Objet', 'Validez vos connaissances sur les classes et méthodes en PHP.', 20]);
        $evalId2 = $this->conn->lastInsertId();

        $pQuest->execute([$evalId2, 'Quel mot-clé est utilisé pour créer une instance d\'une classe en PHP ?', 'this', 'new', 'instance', 'create', 'B', 10]);
        $pQuest->execute([$evalId2, 'Comment déclare-t-on un constructeur dans une classe PHP ?', 'function __construct()', 'function constructor()', 'construct()', 'function class_name()', 'A', 10]);

        // Evaluation 3 (Homework for Lesson 3)
        $pEval->execute([$lessonId3, 'homework', 'Devoir Pratique : Formulaire de contact AJAX', 'Réalisez un formulaire de contact en HTML qui transmet ses données à un script PHP via AJAX Fetch. Déposez votre code au format ZIP ou PDF.', 20]);
    }
}
