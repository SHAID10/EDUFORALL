<?php
// api.php - Unified AJAX API backend for EDUFORALL LMS

// Buffer output to prevent PHP warnings from corrupting JSON responses
ob_start();
error_reporting(0);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'db.php';

// Clear any buffered output before sending JSON
ob_clean();

// Check user authentication
if (!isset($_SESSION['user_id'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Non autorisé. Veuillez vous connecter.']);
    exit;
}

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['user_role'];
$userName = $_SESSION['user_name'];

$conn = DB::getConnection();
$dbType = DB::getDbType();

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// Helper for file uploads
function handleFileUpload($fileField, $targetSubfolder) {
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    
    $uploadDir = __DIR__ . '/uploads/' . $targetSubfolder . '/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $fileTmpPath = $_FILES[$fileField]['tmp_name'];
    $originalName = basename($_FILES[$fileField]['name']);
    $fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);
    
    // Clean filename
    $cleanName = preg_replace('/[^a-zA-Z0-9_\.-]/', '', pathinfo($originalName, PATHINFO_FILENAME));
    $newFileName = $cleanName . '_' . uniqid() . '.' . $fileExtension;
    $destPath = $uploadDir . $newFileName;
    
    if (move_uploaded_file($fileTmpPath, $destPath)) {
        return 'uploads/' . $targetSubfolder . '/' . $newFileName;
    }
    
    return null;
}

// ROUTE ACTION DISPATCHER
try {
    switch ($action) {
        // --- COMMON / DASHBOARD STATS ---
        case 'get_dashboard_stats':
            if ($userRole === 'student') {
                // Total completed lessons
                $completedStmt = $conn->prepare("SELECT COUNT(*) FROM student_progress WHERE student_id = ?");
                $completedStmt->execute([$userId]);
                $completedCount = $completedStmt->fetchColumn();

                // Total lessons available in system
                $totalLessons = $conn->query("SELECT COUNT(*) FROM lessons")->fetchColumn();
                $generalProgress = $totalLessons > 0 ? round(($completedCount / $totalLessons) * 100) : 0;

                // Submissions and average grade
                $subStmt = $conn->prepare("SELECT AVG(score) FROM submissions WHERE student_id = ? AND status = 'graded'");
                $subStmt->execute([$userId]);
                $avgGrade = $subStmt->fetchColumn();
                $avgGrade = $avgGrade !== null ? round((float)$avgGrade, 2) : null;

                // Active courses count
                $courseCount = $conn->query("SELECT COUNT(*) FROM courses")->fetchColumn();

                // Certificates count
                $certCountStmt = $conn->prepare("SELECT COUNT(*) FROM certificates WHERE student_id = ?");
                $certCountStmt->execute([$userId]);
                $certCount = $certCountStmt->fetchColumn();

                // Recent grades
                $recentStmt = $conn->prepare("
                    SELECT s.score, e.title as eval_title, e.max_points, c.title as course_title, s.graded_at
                    FROM submissions s
                    JOIN evaluations e ON s.evaluation_id = e.id
                    JOIN lessons l ON e.lesson_id = l.id
                    JOIN courses c ON l.course_id = c.id
                    WHERE s.student_id = ? AND s.status = 'graded'
                    ORDER BY s.graded_at DESC LIMIT 5
                ");
                $recentStmt->execute([$userId]);
                $recentGrades = $recentStmt->fetchAll();

                echo json_encode([
                    'success' => true,
                    'stats' => [
                        'progress' => $generalProgress,
                        'completed_lessons' => $completedCount,
                        'total_lessons' => $totalLessons,
                        'avg_grade' => $avgGrade,
                        'courses_count' => $courseCount,
                        'certificates_count' => $certCount,
                        'recent_grades' => $recentGrades
                    ]
                ]);
            } 
            elseif ($userRole === 'teacher') {
                // Total courses taught by this teacher
                $stmt = $conn->prepare("SELECT COUNT(*) FROM courses WHERE teacher_id = ?");
                $stmt->execute([$userId]);
                $coursesCount = $stmt->fetchColumn();

                // Submissions pending grading
                $stmt = $conn->prepare("
                    SELECT COUNT(*) FROM submissions s
                    JOIN evaluations e ON s.evaluation_id = e.id
                    JOIN lessons l ON e.lesson_id = l.id
                    JOIN courses c ON l.course_id = c.id
                    WHERE c.teacher_id = ? AND s.status = 'pending'
                ");
                $stmt->execute([$userId]);
                $pendingCount = $stmt->fetchColumn();

                // Total students enrolled (unique students submitting to this teacher's courses)
                $stmt = $conn->prepare("
                    SELECT COUNT(DISTINCT s.student_id) FROM submissions s
                    JOIN evaluations e ON s.evaluation_id = e.id
                    JOIN lessons l ON e.lesson_id = l.id
                    JOIN courses c ON l.course_id = c.id
                    WHERE c.teacher_id = ?
                ");
                $stmt->execute([$userId]);
                $studentsCount = $stmt->fetchColumn();

                // Teacher courses list
                $stmt = $conn->prepare("SELECT id, title, subject_id FROM courses WHERE teacher_id = ?");
                $stmt->execute([$userId]);
                $myCourses = $stmt->fetchAll();

                echo json_encode([
                    'success' => true,
                    'stats' => [
                        'courses_count' => $coursesCount,
                        'pending_grading' => $pendingCount,
                        'students_count' => $studentsCount,
                        'my_courses' => $myCourses
                    ]
                ]);
            } 
            elseif ($userRole === 'promoter') {
                // Promoter stats
                $students = $conn->query("SELECT COUNT(*) FROM users WHERE role = 'student'")->fetchColumn();
                $teachers = $conn->query("SELECT COUNT(*) FROM users WHERE role = 'teacher'")->fetchColumn();
                $subjects = $conn->query("SELECT COUNT(*) FROM subjects")->fetchColumn();
                $modules = $conn->query("SELECT COUNT(*) FROM modules")->fetchColumn();
                $certs = $conn->query("SELECT COUNT(*) FROM certificates")->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'stats' => [
                        'students_count' => $students,
                        'teachers_count' => $teachers,
                        'subjects_count' => $subjects,
                        'modules_count' => $modules,
                        'certificates_issued' => $certs
                    ]
                ]);
            }
            break;

        // --- SUBJECTS (MATIERES) ---
        case 'get_subjects':
            $stmt = $conn->query("
                SELECT s.*, u.name as promoter_name 
                FROM subjects s 
                LEFT JOIN users u ON s.created_by = u.id 
                ORDER BY s.id ASC
            ");
            echo json_encode(['success' => true, 'subjects' => $stmt->fetchAll()]);
            break;

        case 'add_subject':
            if ($userRole !== 'promoter') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux promoteurs.']);
                exit;
            }
            $code = strtoupper(trim($_POST['id'] ?? ''));
            $name = trim($_POST['name'] ?? '');
            $desc = trim($_POST['description'] ?? '');

            if (empty($code) || empty($name)) {
                echo json_encode(['success' => false, 'message' => 'Le code et le nom sont requis.']);
                exit;
            }

            // Check duplicate
            $chk = $conn->prepare("SELECT id FROM subjects WHERE id = ?");
            $chk->execute([$code]);
            if ($chk->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Cette matière (code) existe déjà.']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO subjects (id, name, description, created_by) VALUES (?, ?, ?, ?)");
            $stmt->execute([$code, $name, $desc, $userId]);
            echo json_encode(['success' => true, 'message' => 'Matière créée avec succès.']);
            break;

        // --- MODULES & CERTIFICATES ---
        case 'get_modules':
            // Fetch modules
            $stmt = $conn->query("SELECT * FROM modules ORDER BY id DESC");
            $modules = $stmt->fetchAll();

            // Fetch subject linkages for each module
            foreach ($modules as &$mod) {
                $subStmt = $conn->prepare("
                    SELECT s.id, s.name 
                    FROM module_subjects ms
                    JOIN subjects s ON ms.subject_id = s.id
                    WHERE ms.module_id = ?
                ");
                $subStmt->execute([$mod['id']]);
                $mod['subjects'] = $subStmt->fetchAll();
                
                // If student, check if they earned the certificate
                if ($userRole === 'student') {
                    $certStmt = $conn->prepare("SELECT * FROM certificates WHERE student_id = ? AND module_id = ?");
                    $certStmt->execute([$userId, $mod['id']]);
                    $cert = $certStmt->fetch();
                    $mod['certificate'] = $cert ? $cert : null;
                }
            }
            echo json_encode(['success' => true, 'modules' => $modules]);
            break;

        case 'add_module':
            if ($userRole !== 'promoter') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux promoteurs.']);
                exit;
            }
            $name = trim($_POST['name'] ?? '');
            $desc = trim($_POST['description'] ?? '');
            $subjectIds = $_POST['subject_ids'] ?? []; // Array of subject IDs

            if (empty($name)) {
                echo json_encode(['success' => false, 'message' => 'Le nom du module est requis.']);
                exit;
            }

            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare("INSERT INTO modules (name, description) VALUES (?, ?)");
                $stmt->execute([$name, $desc]);
                $moduleId = $conn->lastInsertId();

                if (!empty($subjectIds)) {
                    $subStmt = $conn->prepare("INSERT INTO module_subjects (module_id, subject_id) VALUES (?, ?)");
                    foreach ($subjectIds as $subId) {
                        $subStmt->execute([$moduleId, $subId]);
                    }
                }
                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Module créé avec succès.']);
            } catch (Exception $e) {
                $conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la création du module : ' . $e->getMessage()]);
            }
            break;

        case 'validate_module_certificate':
            // Check validation and issue certificate for a student in a module
            $studentId = ($userRole === 'student') ? $userId : (int)($_POST['student_id'] ?? 0);
            $moduleId = (int)($_POST['module_id'] ?? 0);

            if ($studentId <= 0 || $moduleId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Données invalides.']);
                exit;
            }

            // Check if certificate already exists
            $chk = $conn->prepare("SELECT * FROM certificates WHERE student_id = ? AND module_id = ?");
            $chk->execute([$studentId, $moduleId]);
            $existing = $chk->fetch();
            if ($existing) {
                echo json_encode(['success' => true, 'message' => 'Certificat déjà validé.', 'certificate' => $existing]);
                exit;
            }

            // Get subjects in this module
            $subStmt = $conn->prepare("SELECT subject_id FROM module_subjects WHERE module_id = ?");
            $subStmt->execute([$moduleId]);
            $subjects = $subStmt->fetchAll(PDO::FETCH_COLUMN);

            if (empty($subjects)) {
                echo json_encode(['success' => false, 'message' => 'Ce module ne contient aucune matière.']);
                exit;
            }

            // Validation Rule: For each subject, the student must have evaluated progress and an average score >= 12/20
            $moduleValidated = true;
            $subjectGrades = [];

            foreach ($subjects as $subId) {
                // Fetch all courses for this subject
                $cStmt = $conn->prepare("SELECT id FROM courses WHERE subject_id = ?");
                $cStmt->execute([$subId]);
                $courseIds = $cStmt->fetchAll(PDO::FETCH_COLUMN);

                if (empty($courseIds)) {
                    $moduleValidated = false; // Cannot validate if course doesn't exist
                    break;
                }

                // Fetch all evaluations for these courses
                $placeholder = implode(',', array_fill(0, count($courseIds), '?'));
                $eStmt = $conn->prepare("
                    SELECT e.id FROM evaluations e
                    JOIN lessons l ON e.lesson_id = l.id
                    WHERE l.course_id IN ($placeholder)
                ");
                $eStmt->execute($courseIds);
                $evalIds = $eStmt->fetchAll(PDO::FETCH_COLUMN);

                if (empty($evalIds)) {
                    // No evaluations in courses for this subject, skip or consider as incomplete
                    $moduleValidated = false;
                    break;
                }

                // Fetch student grades for these evaluations
                $evalPlaceholder = implode(',', array_fill(0, count($evalIds), '?'));
                $params = array_merge([$studentId], $evalIds);
                $gStmt = $conn->prepare("
                    SELECT score, max_points FROM submissions 
                    WHERE student_id = ? AND evaluation_id IN ($evalPlaceholder) AND status = 'graded'
                ");
                $gStmt->execute($params);
                $grades = $gStmt->fetchAll();

                // Check if all evaluations have been submitted and graded, and calculate average
                if (count($grades) < count($evalIds)) {
                    $moduleValidated = false; // Student did not complete all evaluations
                    break;
                }

                $totalScoreObtained = 0;
                $totalMaxPoints = 0;
                foreach ($grades as $g) {
                    $totalScoreObtained += (float)$g['score'];
                    $totalMaxPoints += (float)$g['max_points'];
                }

                // Normalize average to 20 points
                $normalizedAverage = ($totalMaxPoints > 0) ? ($totalScoreObtained / $totalMaxPoints) * 20 : 0;

                if ($normalizedAverage < 12.0) {
                    $moduleValidated = false; // Under 12/20 average threshold
                    break;
                }
                $subjectGrades[$subId] = $normalizedAverage;
            }

            if ($moduleValidated) {
                // Issue certificate
                $hashCode = hash('sha256', $studentId . '-' . $moduleId . '-' . time() . '-EDUFORALL');
                $ins = $conn->prepare("INSERT INTO certificates (student_id, module_id, hash_code) VALUES (?, ?, ?)");
                $ins->execute([$studentId, $moduleId, $hashCode]);
                $certId = $conn->lastInsertId();

                $newCert = [
                    'id' => $certId,
                    'student_id' => $studentId,
                    'module_id' => $moduleId,
                    'issued_at' => date('Y-m-d H:i:s'),
                    'hash_code' => $hashCode
                ];

                echo json_encode([
                    'success' => true,
                    'validated' => true,
                    'message' => 'Félicitations ! Vous avez validé ce module et obtenu votre certificat.',
                    'certificate' => $newCert
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'validated' => false,
                    'message' => 'Le module n\'est pas encore validé. Assurez-vous d\'avoir complété toutes les évaluations avec une moyenne d\'au moins 12/20.'
                ]);
            }
            break;

        // --- COURSES & LESSONS ---
        case 'get_courses':
            $subjectFilter = $_GET['subject_id'] ?? '';
            
            $query = "
                SELECT c.*, s.name as subject_name, u.name as teacher_name
                FROM courses c
                JOIN subjects s ON c.subject_id = s.id
                JOIN users u ON c.teacher_id = u.id
            ";
            
            $params = [];
            if (!empty($subjectFilter)) {
                $query .= " WHERE c.subject_id = ?";
                $params[] = $subjectFilter;
            }
            $query .= " ORDER BY c.id DESC";
            
            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $courses = $stmt->fetchAll();

            // Calculate progress per course if student
            if ($userRole === 'student') {
                foreach ($courses as &$c) {
                    // Total lessons in course
                    $lStmt = $conn->prepare("SELECT COUNT(*) FROM lessons WHERE course_id = ?");
                    $lStmt->execute([$c['id']]);
                    $totalL = $lStmt->fetchColumn();

                    if ($totalL > 0) {
                        // Completed lessons
                        $compStmt = $conn->prepare("
                            SELECT COUNT(*) FROM student_progress sp
                            JOIN lessons l ON sp.lesson_id = l.id
                            WHERE sp.student_id = ? AND l.course_id = ?
                        ");
                        $compStmt->execute([$userId, $c['id']]);
                        $compL = $compStmt->fetchColumn();
                        
                        $c['progress_percent'] = round(($compL / $totalL) * 100);
                    } else {
                        $c['progress_percent'] = 0;
                    }
                }
            }

            echo json_encode(['success' => true, 'courses' => $courses]);
            break;

        case 'add_course':
            if ($userRole !== 'teacher') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux enseignants.']);
                exit;
            }
            $subjectId = $_POST['subject_id'] ?? '';
            $title = trim($_POST['title'] ?? '');
            $desc = trim($_POST['description'] ?? '');

            if (empty($subjectId) || empty($title)) {
                echo json_encode(['success' => false, 'message' => 'Le titre et la matière sont requis.']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO courses (subject_id, teacher_id, title, description) VALUES (?, ?, ?, ?)");
            $stmt->execute([$subjectId, $userId, $title, $desc]);
            echo json_encode(['success' => true, 'message' => 'Cours créé avec succès.', 'course_id' => $conn->lastInsertId()]);
            break;

        case 'get_course_details':
            $courseId = (int)($_GET['course_id'] ?? 0);
            if ($courseId <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID de cours invalide.']);
                exit;
            }

            // Fetch course meta
            $cStmt = $conn->prepare("SELECT c.*, s.name as subject_name, u.name as teacher_name FROM courses c JOIN subjects s ON c.subject_id = s.id JOIN users u ON c.teacher_id = u.id WHERE c.id = ?");
            $cStmt->execute([$courseId]);
            $course = $cStmt->fetch();

            if (!$course) {
                echo json_encode(['success' => false, 'message' => 'Cours introuvable.']);
                exit;
            }

            // Fetch lessons
            $lStmt = $conn->prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC, id ASC");
            $lStmt->execute([$courseId]);
            $lessons = $lStmt->fetchAll();

            // Attach evaluation and student submission/completion details to each lesson
            foreach ($lessons as &$lesson) {
                // Progress status
                if ($userRole === 'student') {
                    $progStmt = $conn->prepare("SELECT * FROM student_progress WHERE student_id = ? AND lesson_id = ?");
                    $progStmt->execute([$userId, $lesson['id']]);
                    $lesson['completed'] = $progStmt->fetch() ? true : false;
                }

                // Evaluation status
                $eStmt = $conn->prepare("SELECT * FROM evaluations WHERE lesson_id = ?");
                $eStmt->execute([$lesson['id']]);
                $eval = $eStmt->fetch();

                if ($eval) {
                    $lesson['evaluation'] = $eval;
                    
                    // Attach submission details if student
                    if ($userRole === 'student') {
                        $subStmt = $conn->prepare("SELECT * FROM submissions WHERE evaluation_id = ? AND student_id = ?");
                        $subStmt->execute([$eval['id'], $userId]);
                        $submission = $subStmt->fetch();
                        
                        $lesson['submission'] = $submission ? $submission : null;
                    }
                    
                    // Attach questions count if quiz
                    if ($eval['type'] === 'quiz') {
                        $qStmt = $conn->prepare("SELECT COUNT(*) FROM quiz_questions WHERE evaluation_id = ?");
                        $qStmt->execute([$eval['id']]);
                        $lesson['evaluation']['questions_count'] = $qStmt->fetchColumn();
                    }
                } else {
                    $lesson['evaluation'] = null;
                }
            }

            echo json_encode([
                'success' => true,
                'course' => $course,
                'lessons' => $lessons
            ]);
            break;

        case 'add_lesson':
            if ($userRole !== 'teacher') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux enseignants.']);
                exit;
            }
            $courseId = (int)($_POST['course_id'] ?? 0);
            $title = trim($_POST['title'] ?? '');
            $desc = trim($_POST['description'] ?? '');
            $contentType = $_POST['content_type'] ?? 'pdf'; // pdf, video, link
            $orderIndex = (int)($_POST['order_index'] ?? 0);
            $contentPath = '';

            if (empty($title) || $courseId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Données obligatoires manquantes.']);
                exit;
            }

            if ($contentType === 'link') {
                $contentPath = trim($_POST['content_link'] ?? '');
                if (empty($contentPath)) {
                    echo json_encode(['success' => false, 'message' => 'Le lien de la ressource est requis.']);
                    exit;
                }
            } else {
                // Handle PDF or Video upload
                $uploaded = handleFileUpload('content_file', 'lessons');
                if ($uploaded) {
                    $contentPath = $uploaded;
                } else {
                    // Fallback to manual link/text if upload failed or wasn't provided
                    $contentPath = trim($_POST['content_link_fallback'] ?? '');
                    if (empty($contentPath)) {
                        echo json_encode(['success' => false, 'message' => 'Veuillez téléverser un fichier valide ou fournir un lien alternatif.']);
                        exit;
                    }
                }
            }

            $stmt = $conn->prepare("INSERT INTO lessons (course_id, title, content_type, content_path, description, order_index) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$courseId, $title, $contentType, $contentPath, $desc, $orderIndex]);
            echo json_encode(['success' => true, 'message' => 'Leçon ajoutée avec succès.', 'lesson_id' => $conn->lastInsertId()]);
            break;

        case 'complete_lesson':
            // Students marking lesson as read/finished
            if ($userRole !== 'student') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux étudiants.']);
                exit;
            }
            $lessonId = (int)($_POST['lesson_id'] ?? 0);
            if ($lessonId <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID de leçon invalide.']);
                exit;
            }

            // Insert into student progress
            $stmt = $conn->prepare("INSERT OR IGNORE INTO student_progress (student_id, lesson_id) VALUES (?, ?)");
            // Note: SQLite uses INSERT OR IGNORE, MySQL uses INSERT IGNORE. Let's make it compatible.
            if ($dbType === 'mysql') {
                $stmt = $conn->prepare("INSERT IGNORE INTO student_progress (student_id, lesson_id) VALUES (?, ?)");
            }
            
            $stmt->execute([$userId, $lessonId]);
            echo json_encode(['success' => true, 'message' => 'Leçon marquée comme lue.']);
            break;

        // --- EVALUATIONS (QUIZZES & HOMEWORK) ---
        case 'add_evaluation':
            if ($userRole !== 'teacher') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux enseignants.']);
                exit;
            }
            $lessonId = (int)($_POST['lesson_id'] ?? 0);
            $type = $_POST['type'] ?? 'quiz'; // quiz, homework
            $title = trim($_POST['title'] ?? '');
            $desc = trim($_POST['description'] ?? '');
            $maxPoints = (int)($_POST['max_points'] ?? 20);

            if (empty($title) || $lessonId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Le titre est requis.']);
                exit;
            }

            // Check if lesson already has an evaluation
            $chk = $conn->prepare("SELECT id FROM evaluations WHERE lesson_id = ?");
            $chk->execute([$lessonId]);
            if ($chk->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Cette leçon contient déjà une évaluation.']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO evaluations (lesson_id, type, title, description, max_points) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$lessonId, $type, $title, $desc, $maxPoints]);
            echo json_encode(['success' => true, 'message' => 'Évaluation créée avec succès.', 'evaluation_id' => $conn->lastInsertId()]);
            break;

        case 'add_quiz_question':
            if ($userRole !== 'teacher') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux enseignants.']);
                exit;
            }
            $evalId = (int)($_POST['evaluation_id'] ?? 0);
            $text = trim($_POST['question_text'] ?? '');
            $a = trim($_POST['option_a'] ?? '');
            $b = trim($_POST['option_b'] ?? '');
            $c = trim($_POST['option_c'] ?? '');
            $d = trim($_POST['option_d'] ?? '');
            $correct = strtoupper(trim($_POST['correct_option'] ?? 'A'));
            $points = (int)($_POST['points'] ?? 5);

            if (empty($text) || empty($a) || empty($b) || empty($correct) || $evalId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Veuillez remplir la question et au moins l\'option A et B.']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO quiz_questions (evaluation_id, question_text, option_a, option_b, option_c, option_d, correct_option, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$evalId, $text, $a, $b, $c, $d, $correct, $points]);
            echo json_encode(['success' => true, 'message' => 'Question ajoutée avec succès.']);
            break;

        case 'get_quiz_questions':
            $evalId = (int)($_GET['evaluation_id'] ?? 0);
            if ($evalId <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID d\'évaluation invalide.']);
                exit;
            }

            $stmt = $conn->prepare("SELECT id, question_text, option_a, option_b, option_c, option_d, points FROM quiz_questions WHERE evaluation_id = ?");
            $stmt->execute([$evalId]);
            $questions = $stmt->fetchAll();

            // We hide the 'correct_option' field from students when they fetch questions!
            echo json_encode(['success' => true, 'questions' => $questions]);
            break;

        case 'submit_quiz':
            if ($userRole !== 'student') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux étudiants.']);
                exit;
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data)) {
                $data = $_POST;
            }

            $evalId = (int)($data['evaluation_id'] ?? 0);
            $answers = $data['answers'] ?? []; // Map of question_id -> correct_option

            if ($evalId <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID d\'évaluation invalide.']);
                exit;
            }

            // Check if already submitted
            $chk = $conn->prepare("SELECT id FROM submissions WHERE evaluation_id = ? AND student_id = ?");
            $chk->execute([$evalId, $userId]);
            if ($chk->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Vous avez déjà soumis cette évaluation.']);
                exit;
            }

            // Fetch correct answers
            $qStmt = $conn->prepare("SELECT id, correct_option, points FROM quiz_questions WHERE evaluation_id = ?");
            $qStmt->execute([$evalId]);
            $questions = $qStmt->fetchAll();

            if (empty($questions)) {
                echo json_encode(['success' => false, 'message' => 'Ce quiz ne contient aucune question.']);
                exit;
            }

            $score = 0;
            $maxPoints = 0;

            foreach ($questions as $q) {
                $qId = $q['id'];
                $correctOpt = strtoupper($q['correct_option']);
                $pts = (int)$q['points'];
                $maxPoints += $pts;

                $studentOpt = strtoupper($answers[$qId] ?? '');
                if ($studentOpt === $correctOpt) {
                    $score += $pts;
                }
            }

            // Fetch target evaluation details to check max score
            $eStmt = $conn->prepare("SELECT max_points, lesson_id FROM evaluations WHERE id = ?");
            $eStmt->execute([$evalId]);
            $evalMeta = $eStmt->fetch();
            $evalMax = (int)($evalMeta['max_points'] ?? 20);

            // Scale score to match max_points of evaluation
            if ($maxPoints > 0) {
                $scaledScore = round(($score / $maxPoints) * $evalMax, 2);
            } else {
                $scaledScore = 0;
            }

            // Insert submission
            $subText = json_encode($answers);
            $ins = $conn->prepare("INSERT INTO submissions (evaluation_id, student_id, submission_text, score, status, graded_at) VALUES (?, ?, ?, ?, 'graded', CURRENT_TIMESTAMP)");
            $ins->execute([$evalId, $userId, $subText, $scaledScore]);

            // Automatically mark the lesson as completed!
            $lessonId = (int)$evalMeta['lesson_id'];
            $prog = $conn->prepare("INSERT OR IGNORE INTO student_progress (student_id, lesson_id) VALUES (?, ?)");
            if ($dbType === 'mysql') {
                $prog = $conn->prepare("INSERT IGNORE INTO student_progress (student_id, lesson_id) VALUES (?, ?)");
            }
            $prog->execute([$userId, $lessonId]);

            echo json_encode([
                'success' => true,
                'message' => 'Quiz soumis avec succès !',
                'score' => $scaledScore,
                'max_points' => $evalMax
            ]);
            break;

        case 'submit_homework':
            if ($userRole !== 'student') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux étudiants.']);
                exit;
            }
            $evalId = (int)($_POST['evaluation_id'] ?? 0);
            $text = trim($_POST['submission_text'] ?? '');

            if ($evalId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Évaluation non spécifiée.']);
                exit;
            }

            // Check if already submitted
            $chk = $conn->prepare("SELECT id FROM submissions WHERE evaluation_id = ? AND student_id = ?");
            $chk->execute([$evalId, $userId]);
            if ($chk->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Vous avez déjà soumis ce devoir.']);
                exit;
            }

            // Handle file upload
            $filePath = handleFileUpload('submission_file', 'submissions');
            if (!$filePath && empty($text)) {
                echo json_encode(['success' => false, 'message' => 'Veuillez téléverser un fichier ou écrire un texte de soumission.']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO submissions (evaluation_id, student_id, submission_text, file_path, status) VALUES (?, ?, ?, ?, 'pending')");
            $stmt->execute([$evalId, $userId, $text, $filePath]);

            // Mark the lesson as completed when they submit the homework
            $eStmt = $conn->prepare("SELECT lesson_id FROM evaluations WHERE id = ?");
            $eStmt->execute([$evalId]);
            $lessonId = $eStmt->fetchColumn();
            
            $prog = $conn->prepare("INSERT OR IGNORE INTO student_progress (student_id, lesson_id) VALUES (?, ?)");
            if ($dbType === 'mysql') {
                $prog = $conn->prepare("INSERT IGNORE INTO student_progress (student_id, lesson_id) VALUES (?, ?)");
            }
            $prog->execute([$userId, $lessonId]);

            echo json_encode(['success' => true, 'message' => 'Devoir soumis avec succès.']);
            break;

        case 'get_submissions_for_grading':
            if ($userRole !== 'teacher') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux enseignants.']);
                exit;
            }

            $stmt = $conn->prepare("
                SELECT s.*, u.name as student_name, u.email as student_email, e.title as evaluation_title, e.max_points, c.title as course_title
                FROM submissions s
                JOIN evaluations e ON s.evaluation_id = e.id
                JOIN lessons l ON e.lesson_id = l.id
                JOIN courses c ON l.course_id = c.id
                JOIN users u ON s.student_id = u.id
                WHERE c.teacher_id = ?
                ORDER BY s.status DESC, s.submitted_at DESC
            ");
            $stmt->execute([$userId]);
            echo json_encode(['success' => true, 'submissions' => $stmt->fetchAll()]);
            break;

        case 'grade_submission':
            if ($userRole !== 'teacher') {
                echo json_encode(['success' => false, 'message' => 'Réservé aux enseignants.']);
                exit;
            }
            $subId = (int)($_POST['submission_id'] ?? 0);
            $score = (float)($_POST['score'] ?? 0);
            $feedback = trim($_POST['feedback'] ?? '');

            if ($subId <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID de soumission invalide.']);
                exit;
            }

            // Get max points allowed
            $chk = $conn->prepare("SELECT e.max_points FROM submissions s JOIN evaluations e ON s.evaluation_id = e.id WHERE s.id = ?");
            $chk->execute([$subId]);
            $maxPoints = (float)$chk->fetchColumn();

            if ($score < 0 || $score > $maxPoints) {
                echo json_encode(['success' => false, 'message' => "La note doit être comprise entre 0 et $maxPoints."]);
                exit;
            }

            $stmt = $conn->prepare("UPDATE submissions SET score = ?, feedback = ?, status = 'graded', graded_at = CURRENT_TIMESTAMP, graded_by = ? WHERE id = ?");
            $stmt->execute([$score, $feedback, $userId, $subId]);

            echo json_encode(['success' => true, 'message' => 'Devoir noté avec succès.']);
            break;

        // --- STUDENT GRADES & PROGRESS REPORT ---
        case 'get_student_grades':
            // Check student id (self or for teacher query)
            $targetStudentId = ($userRole === 'student') ? $userId : (int)($_GET['student_id'] ?? 0);

            if ($targetStudentId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Étudiant non spécifié.']);
                exit;
            }

            $stmt = $conn->prepare("
                SELECT s.score, s.feedback, s.status, s.submitted_at, s.graded_at, e.title as eval_title, e.type as eval_type, e.max_points, c.title as course_title, c.subject_id
                FROM submissions s
                JOIN evaluations e ON s.evaluation_id = e.id
                JOIN lessons l ON e.lesson_id = l.id
                JOIN courses c ON l.course_id = c.id
                WHERE s.student_id = ?
                ORDER BY c.subject_id ASC, s.submitted_at DESC
            ");
            $stmt->execute([$targetStudentId]);
            $grades = $stmt->fetchAll();

            echo json_encode(['success' => true, 'grades' => $grades]);
            break;

        // --- MESSAGING ---
        case 'get_messages':
            $stmt = $conn->prepare("
                SELECT m.*, s.name as sender_name, s.role as sender_role, r.name as receiver_name
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                JOIN users r ON m.receiver_id = r.id
                WHERE m.sender_id = ? OR m.receiver_id = ?
                ORDER BY m.created_at DESC
            ");
            $stmt->execute([$userId, $userId]);
            echo json_encode(['success' => true, 'messages' => $stmt->fetchAll()]);
            break;

        case 'send_message':
            $receiverEmail = trim($_POST['receiver_email'] ?? '');
            $subject = trim($_POST['subject'] ?? '');
            $body = trim($_POST['body'] ?? '');

            if (empty($receiverEmail) || empty($subject) || empty($body)) {
                echo json_encode(['success' => false, 'message' => 'Veuillez renseigner le destinataire, l\'objet et le message.']);
                exit;
            }

            // Find receiver user ID
            $chk = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $chk->execute([$receiverEmail]);
            $receiver = $chk->fetch();

            if (!$receiver) {
                echo json_encode(['success' => false, 'message' => 'Aucun utilisateur trouvé avec cette adresse courriel.']);
                exit;
            }

            if ((int)$receiver['id'] === $userId) {
                echo json_encode(['success' => false, 'message' => 'Vous ne pouvez pas vous envoyer de message à vous-même.']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO messages (sender_id, receiver_id, subject, body) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $receiver['id'], $subject, $body]);
            echo json_encode(['success' => true, 'message' => 'Message envoyé avec succès.']);
            break;

        case 'get_all_users':
            $stmt = $conn->query("SELECT id, name, email, role FROM users ORDER BY name ASC");
            echo json_encode(['success' => true, 'users' => $stmt->fetchAll()]);
            break;

        case 'get_calendar_events':
            $events = [];
            $stmt = $conn->query("SELECT c.title, c.created_at, s.name as subject_name FROM courses c JOIN subjects s ON c.subject_id = s.id ORDER BY c.created_at DESC LIMIT 10");
            while ($row = $stmt->fetch()) {
                $events[] = [
                    'title' => 'Cours cree: ' . $row['title'],
                    'date' => $row['created_at'],
                    'type' => 'course',
                    'subject' => $row['subject_name']
                ];
            }
            $stmt = $conn->query("SELECT e.title, e.created_at, e.type FROM evaluations e ORDER BY e.created_at DESC LIMIT 10");
            while ($row = $stmt->fetch()) {
                $events[] = [
                    'title' => ($row['type'] === 'quiz' ? 'Quiz: ' : 'Devoir: ') . $row['title'],
                    'date' => $row['created_at'],
                    'type' => $row['type']
                ];
            }
            usort($events, function($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });
            echo json_encode(['success' => true, 'events' => $events]);
            break;

        case 'get_promoter_grades_overview':
            if ($userRole !== 'promoter') {
                echo json_encode(['success' => false, 'message' => 'Reserve aux promoteurs.']);
                exit;
            }
            $stmt = $conn->query("
                SELECT u.name as student_name, u.email as student_email,
                       COUNT(s.id) as total_submissions,
                       AVG(s.score) as avg_score,
                       MAX(s.score) as best_score
                FROM submissions s
                JOIN users u ON s.student_id = u.id
                WHERE s.status = 'graded'
                GROUP BY s.student_id
                ORDER BY avg_score DESC
                LIMIT 20
            ");
            echo json_encode(['success' => true, 'students' => $stmt->fetchAll()]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Action inconnue.']);
            break;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur de base de données : ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur générale : ' . $e->getMessage()]);
}
