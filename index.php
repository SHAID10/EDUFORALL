<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EDUFORALL - Plateforme LMS Collaborative & Certifiante</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <nav class="landing-navbar" id="landingNavbar">
        <div class="container">
            <a href="index.php" class="logo">
                <i class="fas fa-graduation-cap"></i>EDU<span>FORALL</span>
            </a>
            <ul class="nav-links">
                <li><a href="#features">Fonctionnalites</a></li>
                <li><a href="#how">Fonctionnement</a></li>
                <li><a href="#contact">Contact</a></li>
                <li><button class="btn btn-outline" onclick="openModal('login-modal')"><i class="fas fa-sign-in-alt"></i> Connexion</button></li>
                <li><button class="btn btn-orange" onclick="openModal('signup-modal')"><i class="fas fa-user-plus"></i> S'inscrire</button></li>
            </ul>
        </div>
    </nav>

    <section class="hero-section">
        <div class="container">
            <div class="hero-grid">
                <div class="hero-content">
                    <h1>
                        Apprendre, Enseigner<br>
                        et Valider vos <span class="highlight">Certificats</span>
                    </h1>
                    <p>
                        Decouvrez EDUFORALL, la plateforme d'apprentissage nouvelle generation. Suivez vos lecons en video ou PDF, passez des quiz dynamiques et decrochez vos diplomes d'etudes valides.
                    </p>
                    <div class="hero-btns">
                        <button class="btn btn-primary" onclick="openModal('signup-modal')"><i class="fas fa-rocket"></i> Debuter l'aventure</button>
                        <button class="btn btn-outline" onclick="openModal('login-modal')"><i class="fas fa-user-circle"></i> Espace Personnel</button>
                    </div>
                </div>
                <div class="hero-visual">
                    <div class="hero-visual-inner">
                        <div class="icon-box">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <h3 style="color: var(--text-dark); font-size: 20px; font-weight: 700;">Plateforme Academique</h3>
                        <p style="color: var(--text-muted); font-size: 14px; margin-top: 6px; line-height: 1.6;">
                            Un environnement integre pour etudiants, enseignants et promoteurs.
                        </p>
                        <div class="hero-stats-bar">
                            <div class="hero-stat-item">
                                <div class="number">500+</div>
                                <div class="label">Etudiants</div>
                            </div>
                            <div class="hero-stat-item">
                                <div class="number">50+</div>
                                <div class="label">Cours</div>
                            </div>
                            <div class="hero-stat-item">
                                <div class="number">98%</div>
                                <div class="label">Satisfaction</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="features-section" id="features">
        <div class="container">
            <div class="section-header">
                <h2>Une plateforme, <span>trois profils</span> de reussite</h2>
                <p>EDUFORALL s'adapte a tous les roles academiques pour offrir une synergie d'apprentissage unique.</p>
            </div>

            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon-wrap">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <h3>Espace Enseignants</h3>
                    <p>Deposez vos cours au format PDF ou video. Organisez-les par chapitres et creez des evaluations personnalisees (Quiz interactifs ou Devoirs pratiques) pour suivre les progres de vos classes.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon-wrap">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <h3>Espace Etudiants</h3>
                    <p>Consultez vos matieres favorites, telechargez les ressources pedagogiques, completez vos lecons et passez des quiz interactifs. Suivez votre progression en temps reel vers votre reussite.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon-wrap">
                        <i class="fas fa-award"></i>
                    </div>
                    <h3>Espace Promoteurs</h3>
                    <p>Configurez le catalogue de matieres, rassemblez les cours sous forme de modules specialises et definissez les criteres de diplomation pour decerner des certificats de reussite infalsifiables.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="how-section" id="how">
        <div class="container">
            <div class="section-header">
                <h2>Comment <span>ca fonctionne</span></h2>
                <p>En seulement 4 etapes, transformez votre apprentissage ou votre enseignement.</p>
            </div>

            <div class="steps-grid">
                <div class="step-card">
                    <div class="step-number">1</div>
                    <h3>Creez votre compte</h3>
                    <p>Inscrivez-vous gratuitement en tant qu'etudiant, enseignant ou promoteur selon votre profil.</p>
                </div>
                <div class="step-card">
                    <div class="step-number">2</div>
                    <h3>Explorez les cours</h3>
                    <p>Parcourez le catalogue de matieres et accedez aux cours prepares par des enseignants qualifies.</p>
                </div>
                <div class="step-card">
                    <div class="step-number">3</div>
                    <h3>Apprenez et evaluez</h3>
                    <p>Suivez les lecons en PDF ou video, puis testez vos connaissances avec des quiz et devoirs.</p>
                </div>
                <div class="step-card">
                    <div class="step-number">4</div>
                    <h3>Obtenez votre certificat</h3>
                    <p>Validez les modules avec une moyenne superieure a 12/20 et recevez votre certificat numerique.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="stats-section">
        <div class="container">
            <div class="stats-grid-large">
                <div class="stat-block">
                    <div class="number">500<span class="plus">+</span></div>
                    <div class="label">Etudiants actifs</div>
                </div>
                <div class="stat-block">
                    <div class="number">50<span class="plus">+</span></div>
                    <div class="label">Cours disponibles</div>
                </div>
                <div class="stat-block">
                    <div class="number">30<span class="plus">+</span></div>
                    <div class="label">Enseignants</div>
                </div>
                <div class="stat-block">
                    <div class="number">15<span class="plus">+</span></div>
                    <div class="label">Certificats delivres</div>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <div class="cta-box">
                <h2>Pret a rejoindre <span class="orange-text">EDUFORALL</span> ?</h2>
                <p>Rejoignez des milliers d'apprenants et d'enseignants qui utilisent deja notre plateforme pour transformer l'education.</p>
                <div class="cta-btns">
                    <button class="btn btn-primary" onclick="openModal('signup-modal')"><i class="fas fa-user-plus"></i> Creez votre compte</button>
                    <button class="btn btn-outline" onclick="openModal('login-modal')"><i class="fas fa-sign-in-alt"></i> Connectez-vous</button>
                </div>
            </div>
        </div>
    </section>

    <footer class="site-footer" id="contact">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="index.php" class="logo">
                        <i class="fas fa-graduation-cap"></i>EDU<span>FORALL</span>
                    </a>
                    <p>EDUFORALL est une plateforme LMS nouvelle generation dediee a l'apprentissage collaboratif et a la certification de competences academiques.</p>
                </div>
                <div class="footer-col">
                    <h4>Plateforme</h4>
                    <ul>
                        <li><a href="#">Fonctionnalites</a></li>
                        <li><a href="#">Tarifs</a></li>
                        <li><a href="#">Documentation</a></li>
                        <li><a href="#">API</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="#">Centre d'aide</a></li>
                        <li><a href="#">Contactez-nous</a></li>
                        <li><a href="#">FAQ</a></li>
                        <li><a href="#">Statut du service</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Conditions d'utilisation</a></li>
                        <li><a href="#">Confidentialite</a></li>
                        <li><a href="#">Cookies</a></li>
                        <li><a href="#">Mentions legales</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <span>&copy; 2026 EDUFORALL. Tous droits reserves.</span>
                <span>Propulse par PHP, MySQL & AJAX</span>
            </div>
        </div>
    </footer>

    <div id="login-modal" class="modal">
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('login-modal')">&times;</button>
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--primary-blue-light), var(--accent-orange-light)); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; color: var(--primary-blue);">
                    <i class="fas fa-sign-in-alt"></i>
                </div>
                <h2 style="font-size: 24px; font-weight: 700; color: var(--text-dark);">Connexion</h2>
                <p style="color: var(--text-muted); margin-top: 4px;">Entrez vos acces pour rejoindre votre espace</p>
            </div>
            
            <form onsubmit="handleLoginSubmit(event)">
                <div class="form-group">
                    <label><i class="fas fa-envelope" style="margin-right: 6px; color: var(--text-muted);"></i> Adresse Courriel</label>
                    <input type="email" name="email" class="form-control" placeholder="nom@exemple.com" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-lock" style="margin-right: 6px; color: var(--text-muted);"></i> Mot de passe</label>
                    <input type="password" name="password" class="form-control" placeholder="Entrez votre mot de passe" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
                    <i class="fas fa-arrow-right"></i> Se connecter
                </button>
            </form>
            <div style="margin-top: 20px; text-align: center; font-size: 14px;">
                <span style="color: var(--text-muted);">Pas encore de compte ?</span>
                <button class="btn-text" onclick="closeModal('login-modal'); openModal('signup-modal')" style="margin-left: 4px;">Creez un compte</button>
            </div>
        </div>
    </div>

    <div id="signup-modal" class="modal">
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('signup-modal')">&times;</button>
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--accent-orange-light), var(--primary-blue-light)); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; color: var(--accent-orange);">
                    <i class="fas fa-user-plus"></i>
                </div>
                <h2 style="font-size: 24px; font-weight: 700; color: var(--text-dark);">Inscription</h2>
                <p style="color: var(--text-muted); margin-top: 4px;">Rejoignez EDUFORALL des aujourd'hui</p>
            </div>
            
            <form onsubmit="handleSignupSubmit(event)">
                <div class="form-group">
                    <label><i class="fas fa-user" style="margin-right: 6px; color: var(--text-muted);"></i> Nom complet</label>
                    <input type="text" name="name" class="form-control" placeholder="Jean Dupont" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-envelope" style="margin-right: 6px; color: var(--text-muted);"></i> Adresse Courriel</label>
                    <input type="email" name="email" class="form-control" placeholder="nom@exemple.com" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-lock" style="margin-right: 6px; color: var(--text-muted);"></i> Mot de passe</label>
                    <input type="password" name="password" class="form-control" placeholder="Minimum 6 caracteres" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-user-tag" style="margin-right: 6px; color: var(--text-muted);"></i> Je suis un(e)</label>
                    <select name="role" class="form-control" required>
                        <option value="student">Etudiant(e)</option>
                        <option value="teacher">Enseignant(e)</option>
                        <option value="promoter">Promoteur / Administrateur</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-orange" style="width: 100%; margin-top: 8px;">
                    <i class="fas fa-check-circle"></i> Creer mon compte
                </button>
            </form>
            <div style="margin-top: 20px; text-align: center; font-size: 14px;">
                <span style="color: var(--text-muted);">Deja inscrit ?</span>
                <button class="btn-text" onclick="closeModal('signup-modal'); openModal('login-modal')" style="margin-left: 4px;">Connectez-vous</button>
            </div>
        </div>
    </div>

    <script>
        function openModal(id) {
            document.getElementById(id).style.display = 'flex';
        }
        function closeModal(id) {
            document.getElementById(id).style.display = 'none';
        }

        function handleLoginSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            fetch('auth.php?action=login', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = 'dashboard.php';
                } else {
                    alert(data.message);
                }
            })
            .catch(err => {
                alert("Une erreur est survenue lors de la connexion.");
            });
        }

        function handleSignupSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            fetch('auth.php?action=signup', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    closeModal('signup-modal');
                    openModal('login-modal');
                } else {
                    alert(data.message);
                }
            })
            .catch(err => {
                alert("Une erreur est survenue lors de l'inscription.");
            });
        }

        window.addEventListener('scroll', function() {
            const navbar = document.getElementById('landingNavbar');
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    </script>
</body>
</html>
