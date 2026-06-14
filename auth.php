<?php
// auth.php - Authentication and Session Management for EDUFORALL LMS

// Buffer output to prevent PHP warnings from corrupting JSON responses
ob_start();
error_reporting(0);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'db.php';

// Clear any buffered output (warnings, notices) before sending headers
ob_clean();
header('Content-Type: application/json');

// Check if dynamic actions are requested
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // If not raw JSON, use POST arrays
    if (empty($data)) {
        $data = $_POST;
    }

    if ($action === 'signup') {
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'student'; // student, teacher, promoter

        if (empty($name) || empty($email) || empty($password) || empty($role)) {
            echo json_encode(['success' => false, 'message' => 'Veuillez remplir tous les champs obligatoires.']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Format de courriel invalide.']);
            exit;
        }

        if (!in_array($role, ['student', 'teacher', 'promoter'])) {
            echo json_encode(['success' => false, 'message' => 'Rôle utilisateur invalide.']);
            exit;
        }

        $conn = DB::getConnection();
        
        // Check if email already exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Cette adresse courriel est déjà utilisée.']);
            exit;
        }

        // Hash and insert
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        
        try {
            $stmt->execute([$name, $email, $hashedPassword, $role]);
            echo json_encode(['success' => true, 'message' => 'Inscription réussie ! Vous pouvez maintenant vous connecter.']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Erreur BDD : ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'login') {
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Veuillez saisir votre courriel et mot de passe.']);
            exit;
        }

        $conn = DB::getConnection();
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            
            echo json_encode([
                'success' => true,
                'message' => 'Connexion réussie !',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Identifiants de connexion incorrects.']);
        }
        exit;
    }
}

// GET Actions
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'check') {
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'authenticated' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'name' => $_SESSION['user_name'],
                    'email' => $_SESSION['user_email'],
                    'role' => $_SESSION['user_role']
                ]
            ]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
        exit;
    }

    if ($action === 'logout') {
        session_unset();
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Déconnexion réussie.']);
        exit;
    }
}
