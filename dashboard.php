<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

$role = $_SESSION['user_role'];
$name = $_SESSION['user_name'];
$email = $_SESSION['user_email'];
$userId = $_SESSION['user_id'];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau de bord - EDUFORALL</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <div class="dashboard-layout">

        <aside class="sidebar">
            <a href="dashboard.php" class="sidebar-brand">
                <i class="fas fa-graduation-cap"></i> EDU<span>FORALL</span>
            </a>
            <ul class="sidebar-menu">
                <li class="active"><a href="#" data-tab="dashboard"><i class="fas fa-th-large"></i> <span>Tableau de bord</span></a></li>

                <?php if ($role === 'student' || $role === 'teacher'): ?>
                    <li><a href="#" data-tab="courses"><i class="fas fa-book-open"></i> <span>Cours</span></a></li>
                <?php endif; ?>

                <?php if ($role === 'student'): ?>
                    <li><a href="#" data-tab="homeworks"><i class="fas fa-file-alt"></i> <span>Devoirs</span></a></li>
                    <li><a href="#" data-tab="quizzes"><i class="fas fa-question-circle"></i> <span>Quiz</span></a></li>
                    <li><a href="#" data-tab="notes"><i class="fas fa-certificate"></i> <span>Notes & Certificats</span></a></li>
                <?php elseif ($role === 'teacher'): ?>
                    <li><a href="#" data-tab="homeworks"><i class="fas fa-check-double"></i> <span>Corriger copies</span></a></li>
                <?php endif; ?>

                <?php if ($role === 'promoter'): ?>
                    <li><a href="#" data-tab="overview"><i class="fas fa-chart-bar"></i> <span>Apercu General</span></a></li>
                <?php endif; ?>
                <li><a href="#" data-tab="messages"><i class="fas fa-envelope"></i> <span>Messagerie</span></a></li>
                <li><a href="#" data-tab="calendar"><i class="fas fa-calendar-alt"></i> <span>Calendrier</span></a></li>
                <li><a href="#" data-tab="profile"><i class="fas fa-user-circle"></i> <span>Profil</span></a></li>
            </ul>
            <div class="sidebar-footer">
                <button class="logout-btn" onclick="App.logout()">
                    <i class="fas fa-sign-out-alt"></i> <span>Deconnexion</span>
                </button>
            </div>
        </aside>

        <div class="main-wrapper">

            <header class="topbar">
                <div class="page-title">
                    <h1 id="page-title-display">Portail Academique</h1>
                </div>
                <div class="user-profile">
                    <div class="user-info">
                        <div class="user-name" id="user-name-display"><?php echo htmlspecialchars($name); ?></div>
                        <div class="user-role" id="user-role-display"><?php echo htmlspecialchars($role); ?></div>
                    </div>
                    <div class="user-avatar-wrap" id="user-avatar-initial"><?php echo strtoupper(substr($name, 0, 1)); ?></div>
                </div>
            </header>

            <main class="dashboard-content">

                <div id="view-dashboard" class="tab-content active">
                    <div class="stats-grid" id="dashboard-stats-wrapper"></div>
                    <div id="role-dashboard-wrapper"></div>
                </div>

                <div id="view-courses" class="tab-content">
                    <div class="content-panel">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin-bottom: 0;">Catalogue des cours</h2>
                        </div>
                        <div id="courses-list-grid" class="course-grid"></div>
                    </div>
                </div>

                <div id="view-course-detail" class="tab-content">
                    <button class="btn btn-outline" onclick="App.switchTab('courses')" style="margin-bottom: 20px;">
                        <i class="fas fa-arrow-left"></i> Retour aux cours
                    </button>
                    <div id="course-details-container"></div>
                </div>

                <div id="view-homeworks" class="tab-content">
                    <?php if ($role === 'teacher'): ?>
                        <div class="content-panel">
                            <h2>Correction des devoirs (<span id="pending-grading-count">0</span> en attente)</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Notes de cours et retours sur les devoirs soumis par vos eleves.</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Etudiant</th>
                                        <th>Cours / Evaluation</th>
                                        <th>Soumission</th>
                                        <th style="text-align: center;">Fichier joint</th>
                                        <th>Correction / Notes</th>
                                    </tr>
                                </thead>
                                <tbody id="teacher-grading-tbody"></tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <div class="content-panel">
                            <h2>Mes Devoirs Soumis</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Retrouvez l'historique et le statut de vos devoirs pratiques.</p>
                            <div id="student-homeworks-wrapper"></div>
                        </div>
                    <?php endif; ?>
                </div>

                <div id="view-quizzes" class="tab-content">
                    <div class="content-panel">
                        <h2>Mes Resultats de Quiz</h2>
                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Consultez les notes des quiz interactifs completes.</p>
                        <div id="student-quizzes-wrapper"></div>
                    </div>
                </div>

                <div id="view-notes" class="tab-content">
                    <div class="dashboard-split">
                        <div class="content-panel">
                            <h2>Mon Bulletin d'Evaluation</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Vos notes globales reparties par matiere academique.</p>
                            <div id="student-bulletin-wrapper"></div>
                        </div>
                        <div class="content-panel">
                            <h2>Mes Modules et Certifications</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Validez vos modules academiques (moyenne 12/20) pour deverrouiller vos certificats de competences.</p>
                            <div id="student-modules-wrapper"></div>
                        </div>
                    </div>
                </div>

                <div id="view-calendar" class="tab-content">
                    <div class="content-panel">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin-bottom: 0;"><i class="fas fa-calendar-alt"></i> Calendrier Academique</h2>
                        </div>
                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Evenements recents sur la plateforme : cours crees, quiz programes, devoirs soumis.</p>
                        <div id="calendar-events-wrapper" style="display: flex; flex-direction: column; gap: 10px;">
                            <p>Chargement des evenements...</p>
                        </div>
                    </div>
                </div>

                <?php if ($role === 'promoter'): ?>
                <div id="view-overview" class="tab-content">
                    <div class="content-panel">
                        <h2><i class="fas fa-chart-bar"></i> Apercu General des Etudiants</h2>
                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Statistiques globales de progression des etudiants sur la plateforme.</p>
                        <div id="promoter-overview-wrapper"></div>
                    </div>
                </div>
                <?php endif; ?>

                <div id="view-messages" class="tab-content">
                    <div class="content-panel">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin-bottom: 0;">Messagerie Interne</h2>
                            <button class="btn btn-orange" onclick="App.openNewMessageModal()"><i class="fas fa-pen"></i> Nouveau Message</button>
                        </div>
                        <div id="messages-list-wrapper" class="messages-list"></div>
                    </div>
                </div>

                <div id="view-profile" class="tab-content">
                    <div class="content-panel" id="profile-details-wrapper"></div>
                </div>

            </main>
        </div>
    </div>

    <div id="new-message-modal" class="modal">
        <div class="modal-content">
            <button class="modal-close" onclick="App.closeNewMessageModal()">&times;</button>
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 52px; height: 52px; border-radius: 14px; background: var(--accent-orange-light); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 22px; color: var(--accent-orange);">
                    <i class="fas fa-paper-plane"></i>
                </div>
                <h2 style="font-size: 22px; font-weight: 700; color: var(--text-dark);">Nouveau Message</h2>
            </div>

            <form id="new-message-form" onsubmit="App.sendMessage(event)">
                <div class="form-group">
                    <label><i class="fas fa-at" style="margin-right: 4px; color: var(--text-muted);"></i> Adresse Courriel du destinataire</label>
                    <input type="email" name="receiver_email" class="form-control" placeholder="destinataire@eduforall.com" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-heading" style="margin-right: 4px; color: var(--text-muted);"></i> Objet</label>
                    <input type="text" name="subject" class="form-control" placeholder="Sujet du message" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-comment-dots" style="margin-right: 4px; color: var(--text-muted);"></i> Corps du message</label>
                    <textarea name="body" class="form-control" rows="5" placeholder="Saisissez votre message..." required></textarea>
                </div>
                <button type="submit" class="btn btn-orange" style="width: 100%;"><i class="fas fa-paper-plane"></i> Envoyer le message</button>
            </form>
        </div>
    </div>

    <div id="certificate-modal" class="modal">
        <div class="modal-content" style="max-width: 680px; padding: 25px;">
            <button class="modal-close" onclick="document.getElementById('certificate-modal').style.display='none'">&times;</button>
            <div id="certificate-modal-body" style="margin-top: 15px;"></div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Imprimer / Sauvegarder en PDF</button>
            </div>
        </div>
    </div>

    <script src="assets/js/components.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
