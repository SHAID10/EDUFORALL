const App = {
    user: null,
    activeTab: 'dashboard',
    activeCourseId: null,
    activeLessonId: null,
    cachedUsers: [],

    init: function() {
        this.checkSession();
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });
    },

    checkSession: function() {
        fetch('auth.php?action=check')
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    this.user = data.user;
                    if (window.location.pathname.endsWith('index.php') || window.location.pathname.endsWith('/')) {
                        window.location.href = 'dashboard.php';
                    } else {
                        this.setupDashboardView();
                    }
                } else {
                    if (window.location.pathname.endsWith('dashboard.php')) {
                        window.location.href = 'index.php';
                    } else {
                        document.body.style.display = 'block';
                    }
                }
            })
            .catch(err => {
                console.error("Session check failed", err);
            });
    },

    setupDashboardView: function() {
        if (!this.user) return;

        document.getElementById('user-name-display').innerText = this.user.name;
        document.getElementById('user-role-display').innerText = this.user.role;
        document.getElementById('user-avatar-initial').innerText = this.user.name.charAt(0).toUpperCase();

        this.switchTab('dashboard');
    },

    switchTab: function(tabId) {
        this.activeTab = tabId;

        document.querySelectorAll('.sidebar-menu li').forEach(li => {
            li.classList.remove('active');
            const link = li.querySelector('a');
            if (link && link.getAttribute('data-tab') === tabId) {
                li.classList.add('active');
            }
        });

        document.querySelectorAll('.tab-content').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${tabId}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        this.loadTabData(tabId);
    },

    loadTabData: function(tabId) {
        switch (tabId) {
            case 'dashboard':
                this.loadDashboardStats();
                break;
            case 'courses':
                this.loadCoursesList();
                break;
            case 'homeworks':
                this.loadHomeworksList();
                break;
            case 'quizzes':
                this.loadQuizzesList();
                break;
            case 'notes':
                this.loadNotesReport();
                break;
            case 'messages':
                this.loadMessagesInbox();
                break;
            case 'calendar':
                this.loadCalendarEvents();
                break;
            case 'overview':
                this.loadPromoterOverview();
                break;
            case 'users':
                this.loadUsersList();
                break;
            case 'user-details':
                // Data loaded by viewUserDetails
                break;
            case 'profile':
                this.loadUserProfile();
                break;
        }
    },

    loadDashboardStats: function() {
        const statsSection = document.getElementById('dashboard-stats-wrapper');
        const roleDashboardSection = document.getElementById('role-dashboard-wrapper');

        statsSection.innerHTML = '<p style="padding: 20px;">Chargement du tableau de bord...</p>';

        fetch('api.php?action=get_dashboard_stats')
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    statsSection.innerHTML = `<p class="orange-text">${data.message}</p>`;
                    return;
                }

                const stats = data.stats;
                let statsHtml = '';
                let roleHtml = '';

                if (this.user.role === 'student') {
                    statsHtml = `
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Progression Generale</h3>
                                <div class="stats-number">${stats.progress}%</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-chart-line"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Lecons Completees</h3>
                                <div class="stats-number">${stats.completed_lessons} / ${stats.total_lessons}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-book-reader"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Moyenne Generale</h3>
                                <div class="stats-number">${stats.avg_grade !== null ? stats.avg_grade + '/20' : 'N/A'}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-calculator"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Certificats Valides</h3>
                                <div class="stats-number">${stats.certificates_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-certificate"></i></div>
                        </div>
                    `;

                    let gradesRows = '';
                    if (stats.recent_grades && stats.recent_grades.length > 0) {
                        stats.recent_grades.forEach(g => {
                            gradesRows += `
                                <li style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                                    <div>
                                        <strong>${escapeHtml(g.eval_title)}</strong>
                                        <br><span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(g.course_title)}</span>
                                    </div>
                                    <span style="font-weight: 600;" class="orange-text">${g.score} / ${g.max_points}</span>
                                </li>
                            `;
                        });
                    } else {
                        gradesRows = '<p style="color: var(--text-muted); padding: 15px;">Aucune note enregistree pour le moment.</p>';
                    }

                    roleHtml = `
                        <div class="dashboard-split">
                            <div class="content-panel">
                                <h2>Vos Cours Recents</h2>
                                <div id="dashboard-recent-courses" class="course-grid">Chargement des cours...</div>
                            </div>
                            <div class="content-panel">
                                <h2>Dernieres Notes</h2>
                                <ul style="list-style: none;">
                                    ${gradesRows}
                                </ul>
                            </div>
                        </div>
                    `;

                    statsSection.innerHTML = statsHtml;
                    roleDashboardSection.innerHTML = roleHtml;
                    this.loadRecentCoursesForStudent();

                } else if (this.user.role === 'teacher') {
                    statsHtml = `
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Mes Cours Actifs</h3>
                                <div class="stats-number">${stats.courses_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Copies a corriger</h3>
                                <div class="stats-number">${stats.pending_grading}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-file-invoice"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Total Etudiants</h3>
                                <div class="stats-number">${stats.students_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-users"></i></div>
                        </div>
                    `;

                    roleHtml = `
                        <div class="dashboard-split">
                            <div class="content-panel">
                                <h2>Creer un Nouveau Cours</h2>
                                <form onsubmit="App.createCourse(event)">
                                    <div class="form-group">
                                        <label><i class="fas fa-tag" style="margin-right: 4px;"></i> Matiere associee</label>
                                        <select id="teacher-course-subject-select" name="subject_id" class="form-control" required>
                                            <option value="">Chargement des matieres...</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fas fa-heading" style="margin-right: 4px;"></i> Titre du cours</label>
                                        <input type="text" name="title" class="form-control" placeholder="Ex: Algorithmes avances" required>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fas fa-align-left" style="margin-right: 4px;"></i> Description du cours</label>
                                        <textarea name="description" class="form-control" rows="4" placeholder="Objectifs pedagogiques, prerequis..." required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-orange"><i class="fas fa-plus-circle"></i> Creer le cours</button>
                                </form>
                            </div>
                            <div class="content-panel">
                                <h2>Mes Cours Creer</h2>
                                <div id="teacher-my-courses-list" style="display: flex; flex-direction: column; gap: 10px;">
                                    Chargement de la liste...
                                </div>
                            </div>
                        </div>
                    `;

                    statsSection.innerHTML = statsHtml;
                    roleDashboardSection.innerHTML = roleHtml;
                    this.loadSubjectsDropdown('teacher-course-subject-select');
                    this.renderTeacherCoursesList(stats.my_courses);

                } else if (this.user.role === 'promoter') {
                    statsHtml = `
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Total Etudiants</h3>
                                <div class="stats-number">${stats.students_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-user-graduate"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Total Enseignants</h3>
                                <div class="stats-number">${stats.teachers_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Matieres creees</h3>
                                <div class="stats-number">${stats.subjects_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-book"></i></div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-details">
                                <h3>Modules Certifiants</h3>
                                <div class="stats-number">${stats.modules_count}</div>
                            </div>
                            <div class="stats-card-icon"><i class="fas fa-layer-group"></i></div>
                        </div>
                    `;

                    roleHtml = `
                        <div class="dashboard-split">
                            <div class="content-panel">
                                <h2>Creer un Module de Cours (Certification)</h2>
                                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
                                    Regroupez plusieurs matieres au sein d'un module academique. Un etudiant validant le module avec plus de 12/20 de moyenne generale obtiendra automatiquement un certificat de reussite.
                                </p>
                                <form onsubmit="App.createModule(event)">
                                    <div class="form-group">
                                        <label><i class="fas fa-cube"></i> Nom du module</label>
                                        <input type="text" name="name" class="form-control" placeholder="Ex: Certificat Specialise en Base de Donnees" required>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fas fa-align-left"></i> Description du module</label>
                                        <textarea name="description" class="form-control" rows="3" placeholder="Description des objectifs de la certification..." required></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fas fa-list"></i> Selectionner les matieres requises (Maintenez Ctrl pour en selectionner plusieurs)</label>
                                        <select id="promoter-module-subjects-select" name="subject_ids[]" class="form-control" multiple style="height: 120px;" required>
                                            <option value="">Chargement des matieres...</option>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn btn-orange"><i class="fas fa-award"></i> Creer le module</button>
                                </form>
                            </div>
                            <div class="content-panel">
                                <h2>Creer une Matiere Academique (ex: INF132)</h2>
                                <form onsubmit="App.createSubject(event)">
                                    <div class="form-group">
                                        <label><i class="fas fa-barcode"></i> Code de la matiere (e.g. INF132, MAT101)</label>
                                        <input type="text" name="id" class="form-control" placeholder="Ex: INF132" style="text-transform: uppercase;" maxlength="10" required>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fas fa-heading"></i> Nom complet</label>
                                        <input type="text" name="name" class="form-control" placeholder="Ex: Introduction aux Bases de Donnees" required>
                                    </div>
                                    <div class="form-group">
                                        <label><i class="fas fa-align-left"></i> Description abregee</label>
                                        <textarea name="description" class="form-control" rows="2" placeholder="Description..."></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary"><i class="fas fa-plus"></i> Ajouter la matiere</button>
                                </form>
                            </div>
                        </div>
                    `;

                    statsSection.innerHTML = statsHtml;
                    roleDashboardSection.innerHTML = roleHtml;
                    this.loadSubjectsDropdown('promoter-module-subjects-select');
                }
            })
            .catch(err => {
                statsSection.innerHTML = '<p class="orange-text">Erreur de chargement du tableau de bord.</p>';
            });
    },

    loadRecentCoursesForStudent: function() {
        const grid = document.getElementById('dashboard-recent-courses');
        fetch('api.php?action=get_courses')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.courses.length > 0) {
                    let html = '';
                    const recent = data.courses.slice(0, 3);
                    recent.forEach(c => {
                        html += Components.renderCourseCard(c, 'student');
                    });
                    grid.innerHTML = html;
                } else {
                    grid.innerHTML = '<p style="color: var(--text-muted); padding: 15px;">Aucun cours disponible.</p>';
                }
            });
    },

    renderTeacherCoursesList: function(courses) {
        const listDiv = document.getElementById('teacher-my-courses-list');
        if (!courses || courses.length === 0) {
            listDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Aucun cours cree.</p>';
            return;
        }

        let html = '';
        courses.forEach(c => {
            html += `
                <div style="background: var(--bg-light); padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 14px;">${escapeHtml(c.title)}</strong>
                        <br><span style="font-size: 11px; color: var(--text-muted);">${c.subject_id}</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="App.viewCourse(${c.id})">
                        <i class="fas fa-cog"></i> Gerer
                    </button>
                </div>
            `;
        });
        listDiv.innerHTML = html;
    },

    loadSubjectsDropdown: function(selectElementId) {
        const select = document.getElementById(selectElementId);
        if (!select) return;

        fetch('api.php?action=get_subjects')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.subjects.length > 0) {
                    let html = '';
                    if (selectElementId !== 'promoter-module-subjects-select') {
                        html += '<option value="">Choisir une matiere...</option>';
                    }
                    data.subjects.forEach(sub => {
                        html += Components.renderSubjectOption(sub);
                    });
                    select.innerHTML = html;
                } else {
                    select.innerHTML = '<option value="">Aucune matiere disponible</option>';
                }
            });
    },

    loadCoursesList: function() {
        const grid = document.getElementById('courses-list-grid');
        grid.innerHTML = '<p style="padding: 20px;">Chargement des cours...</p>';

        fetch('api.php?action=get_courses')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.courses.length > 0) {
                    let html = '';
                    data.courses.forEach(c => {
                        html += Components.renderCourseCard(c, this.user.role);
                    });
                    grid.innerHTML = html;
                } else {
                    grid.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun cours n\'est encore disponible sur la plateforme.</p>';
                }
            });
    },

    viewCourse: function(courseId) {
        this.activeCourseId = courseId;
        this.switchTab('course-detail');
        this.loadCourseDetails(courseId);
    },

    loadCourseDetails: function(courseId) {
        const container = document.getElementById('course-details-container');
        container.innerHTML = '<p style="padding: 20px;">Chargement des details du cours...</p>';

        fetch(`api.php?action=get_course_details&course_id=${courseId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    container.innerHTML = `<div class="alert-banner alert-banner-danger">${data.message}</div>`;
                    return;
                }

                const course = data.course;
                const lessons = data.lessons;

                let lessonsHtml = '';
                if (lessons.length > 0) {
                    lessons.forEach(l => {
                        lessonsHtml += Components.renderLessonRow(l, this.user.role);
                    });
                } else {
                    lessonsHtml = '<p style="color: var(--text-muted); padding: 10px;">Aucune lecon disponible pour le moment.</p>';
                }

                let teacherAddLessonPanel = '';
                if (this.user.role === 'teacher') {
                    teacherAddLessonPanel = `
                        <div class="content-panel" style="margin-top: 30px;">
                            <h2>Ajouter une Lecon</h2>
                            <form onsubmit="App.createLesson(event, ${courseId})" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label><i class="fas fa-heading"></i> Titre de la lecon</label>
                                    <input type="text" name="title" class="form-control" placeholder="Ex: Chapitre 1: Introduction" required>
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-file"></i> Type de ressource</label>
                                    <select name="content_type" class="form-control" onchange="App.toggleLessonUploadFields(this, ${courseId})" required>
                                        <option value="pdf">Document PDF (Televresement)</option>
                                        <option value="video">Video (Televresement)</option>
                                        <option value="link">Lien externe (Video YouTube, URL, etc.)</option>
                                    </select>
                                </div>
                                <div class="form-group" id="lesson-file-upload-group-${courseId}">
                                    <label><i class="fas fa-upload"></i> Fichier a televerser (PDF ou Video)</label>
                                    <input type="file" name="content_file" class="form-control">
                                </div>
                                <div class="form-group" id="lesson-link-upload-group-${courseId}" style="display: none;">
                                    <label><i class="fas fa-link"></i> URL du lien / Integration</label>
                                    <input type="url" name="content_link" class="form-control" placeholder="https://youtube.com/...">
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-sort-numeric-down"></i> Ordre d'affichage (Index)</label>
                                    <input type="number" name="order_index" class="form-control" value="${lessons.length + 1}">
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-align-left"></i> Breve description</label>
                                    <textarea name="description" class="form-control" rows="2"></textarea>
                                </div>
                                <button type="submit" class="btn btn-orange"><i class="fas fa-save"></i> Enregistrer la lecon</button>
                            </form>
                        </div>
                    `;
                }

                let courseHeaderHtml = `
                    <div class="course-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px;">
                            <div>
                                <span class="badge badge-blue">${course.subject_id} - ${escapeHtml(course.subject_name)}</span>
                                <h2 style="font-size: 28px; margin-top: 10px;">${escapeHtml(course.title)}</h2>
                                <p style="color: var(--text-muted); margin-top: 8px; font-size: 15px;">${escapeHtml(course.description || '')}</p>
                            </div>
                            <div style="text-align: right;">
                                <span style="font-size: 13px; color: var(--text-muted);">Cree par l'enseignant :</span>
                                <h4 style="font-size: 16px;">${escapeHtml(course.teacher_name)}</h4>
                            </div>
                        </div>
                    </div>
                `;

                container.innerHTML = `
                    ${courseHeaderHtml}
                    <div class="dashboard-split">
                        <div class="content-panel">
                            <h2><i class="fas fa-list"></i> Lecons du Cours</h2>
                            <div style="margin-top: 15px; display: flex; flex-direction: column;">
                                ${lessonsHtml}
                            </div>
                        </div>
                        <div id="course-details-sidebar" class="sidebar-sub-panel">
                            <div class="content-panel">
                                <h2>Contenu Actif</h2>
                                <p style="color: var(--text-muted); font-size: 14px;">Selectionnez une lecon a gauche pour charger sa ressource et son evaluation.</p>
                            </div>
                        </div>
                    </div>
                    ${teacherAddLessonPanel}
                `;
            });
    },

    toggleLessonUploadFields: function(selectElement, courseId) {
        const fileGroup = document.getElementById(`lesson-file-upload-group-${courseId}`);
        const linkGroup = document.getElementById(`lesson-link-upload-group-${courseId}`);

        if (selectElement.value === 'link') {
            fileGroup.style.display = 'none';
            linkGroup.style.display = 'block';
        } else {
            fileGroup.style.display = 'block';
            linkGroup.style.display = 'none';
        }
    },

    openLessonContent: function(lessonId) {
        this.activeLessonId = lessonId;
        const sidebar = document.getElementById('course-details-sidebar');
        sidebar.innerHTML = '<div class="content-panel"><p>Chargement de la lecon...</p></div>';

        fetch(`api.php?action=get_course_details&course_id=${this.activeCourseId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const lesson = data.lessons.find(l => parseInt(l.id) === lessonId);
                    if (lesson) {
                        this.renderLessonResource(lesson);
                    }
                }
            });
    },

    renderLessonResource: function(lesson) {
        const sidebar = document.getElementById('course-details-sidebar');
        const isStudent = this.user.role === 'student';
        const alreadyCompleted = lesson.completed;

        // For students who haven't completed: they must consume the content fully
        const needsTracking = isStudent && !alreadyCompleted;

        let resourceViewerHtml = '';
        let trackingBarHtml = '';

        if (lesson.content_type === 'pdf') {
            resourceViewerHtml = `
                <div style="margin-bottom: 16px;">
                    <div class="pdf-viewer-wrapper" id="pdf-viewer-${lesson.id}">
                        <iframe src="${lesson.content_path}#toolbar=1&view=FitH" class="pdf-viewer-frame" title="Document PDF"></iframe>
                        ${needsTracking ? `<div class="pdf-scroll-tracker" id="pdf-tracker-${lesson.id}" onscroll="App.onPdfScroll(${lesson.id})"></div>` : ''}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <p style="font-size: 11px; color: var(--text-muted); word-break: break-all;">
                            <i class="fas fa-file-pdf" style="color: var(--danger);"></i> Document PDF
                        </p>
                        <a href="${lesson.content_path}" target="_blank" class="btn btn-outline btn-sm">
                            <i class="fas fa-external-link-alt"></i> Plein ecran
                        </a>
                    </div>
                </div>
            `;
        } else if (lesson.content_type === 'video') {
            resourceViewerHtml = `
                <div style="margin-bottom: 16px;">
                    <div style="position: relative; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); background: #000;">
                        <video id="video-player-${lesson.id}" controls ${needsTracking ? 'controlsList="nodownload"' : ''} style="width: 100%; display: block; max-height: 360px; background: #000;">
                            <source src="${lesson.content_path}" type="video/mp4">
                            Votre navigateur ne supporte pas la lecture de videos HTML5.
                        </video>
                    </div>
                </div>
            `;
        } else {
            // Link - check if YouTube
            const ytId = this.extractYouTubeId(lesson.content_path);
            if (ytId) {
                resourceViewerHtml = `
                    <div style="margin-bottom: 16px;">
                        <div style="position: relative; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); background: #000; aspect-ratio: 16/9;">
                            <div id="yt-player-${lesson.id}" style="width: 100%; height: 100%;"></div>
                        </div>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">
                            <i class="fab fa-youtube" style="color: #FF0000;"></i> Video YouTube integree
                        </p>
                    </div>
                `;
            } else {
                resourceViewerHtml = `
                    <div style="background: #F8FAFC; border: 1px solid var(--border-color); padding: 20px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 14px; background: var(--primary-blue-light); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                            <i class="fas fa-link" style="font-size: 28px; color: var(--primary-blue);"></i>
                        </div>
                        <h4 style="margin: 10px 0;">Ressource Externe</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px; word-break: break-all;">${lesson.content_path}</p>
                        <a href="${lesson.content_path}" target="_blank" class="btn btn-primary btn-sm" onclick="App.markExternalLinkVisited(${lesson.id})">
                            <i class="fas fa-external-link-alt"></i> Visiter le lien
                        </a>
                    </div>
                `;
            }
        }

        // Progress bar + completion button for students
        let completionHtml = '';
        if (isStudent) {
            if (alreadyCompleted) {
                completionHtml = `
                    <div class="alert-banner alert-banner-success" style="margin-top: 10px;">
                        <span><i class="fas fa-check-circle"></i> Vous avez termine cette lecon.</span>
                        <span class="badge badge-success">Complete</span>
                    </div>
                `;
            } else {
                completionHtml = `
                    <div class="completion-tracker" id="completion-tracker-${lesson.id}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; color: var(--text-dark);">
                                <i class="fas fa-eye"></i> Progression de lecture
                            </span>
                            <span style="font-size: 13px; font-weight: 700;" class="orange-text" id="progress-label-${lesson.id}">0%</span>
                        </div>
                        <div class="reading-progress-bar">
                            <div class="reading-progress-fill" id="progress-fill-${lesson.id}" style="width: 0%;"></div>
                        </div>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;" id="completion-hint-${lesson.id}">
                            <i class="fas fa-info-circle"></i> ${this.getCompletionHint(lesson.content_type)}
                        </p>
                        <button class="btn btn-orange" id="complete-btn-${lesson.id}" style="margin-top: 12px; width: 100%; opacity: 0.5; cursor: not-allowed;" disabled onclick="App.finishLesson(${lesson.id})">
                            <i class="fas fa-lock"></i> J'ai termine cette lecon
                        </button>
                    </div>
                `;
            }
        }

        const evalHtml = Components.renderEvaluationSection(lesson, this.user.role);

        sidebar.innerHTML = `
            <div class="content-panel" style="border-top: 4px solid var(--accent-orange);">
                <h2><i class="fas fa-book"></i> ${escapeHtml(lesson.title)}</h2>
                <p style="font-size: 14px; margin-bottom: 20px; color: var(--text-dark);">${escapeHtml(lesson.description || 'Aucune description.')}</p>
                ${resourceViewerHtml}
                ${completionHtml}
            </div>
            ${evalHtml}
        `;

        // Initialize tracking based on content type
        if (needsTracking) {
            if (lesson.content_type === 'video') {
                this.setupVideoTracking(lesson.id);
            } else if (lesson.content_type === 'link') {
                const ytId = this.extractYouTubeId(lesson.content_path);
                if (ytId) {
                    this.setupYouTubeTracking(lesson.id, ytId);
                }
            }
            // PDF tracking is handled via onscroll attribute
        }

        if (this.user.role === 'teacher' && lesson.evaluation && lesson.evaluation.type === 'quiz') {
            this.loadQuizQuestionsForTeacher(lesson.evaluation.id);
        }
    },

    // --- LESSON COMPLETION TRACKING ---
    lessonProgress: {},

    getCompletionHint: function(contentType) {
        if (contentType === 'pdf') {
            return 'Faites defiler le document jusqu\'a la fin pour debloquer le bouton.';
        } else if (contentType === 'video' || contentType === 'link') {
            return 'Regardez la video jusqu\'a la fin pour debloquer le bouton.';
        }
        return 'Consultez la ressource pour debloquer le bouton.';
    },

    extractYouTubeId: function(url) {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    },

    updateLessonProgress: function(lessonId, percent) {
        percent = Math.min(100, Math.round(percent));
        this.lessonProgress[lessonId] = percent;

        const fill = document.getElementById(`progress-fill-${lessonId}`);
        const label = document.getElementById(`progress-label-${lessonId}`);
        const btn = document.getElementById(`complete-btn-${lessonId}`);

        if (fill) fill.style.width = percent + '%';
        if (label) label.innerText = percent + '%';

        // Unlock button at 95%+
        if (percent >= 95 && btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.innerHTML = '<i class="fas fa-check-circle"></i> J\'ai termine cette lecon';
            const hint = document.getElementById(`completion-hint-${lessonId}`);
            if (hint) {
                hint.innerHTML = '<i class="fas fa-check" style="color: var(--success);"></i> Vous pouvez maintenant valider cette lecon !';
                hint.style.color = 'var(--success)';
            }
        }
    },

    onPdfScroll: function(lessonId) {
        const tracker = document.getElementById(`pdf-tracker-${lessonId}`);
        if (!tracker) return;
        const scrollable = tracker.scrollHeight - tracker.clientHeight;
        if (scrollable <= 0) {
            this.updateLessonProgress(lessonId, 100);
            return;
        }
        const percent = (tracker.scrollTop / scrollable) * 100;
        this.updateLessonProgress(lessonId, percent);
    },

    setupVideoTracking: function(lessonId) {
        const video = document.getElementById(`video-player-${lessonId}`);
        if (!video) return;

        let maxWatched = 0;
        video.addEventListener('timeupdate', () => {
            if (video.duration > 0) {
                // Track furthest point reached (prevent skipping by tracking current time vs max)
                if (video.currentTime > maxWatched) {
                    maxWatched = video.currentTime;
                }
                const percent = (maxWatched / video.duration) * 100;
                this.updateLessonProgress(lessonId, percent);
            }
        });
        video.addEventListener('ended', () => {
            this.updateLessonProgress(lessonId, 100);
        });
    },

    setupYouTubeTracking: function(lessonId, videoId) {
        // Load YouTube IFrame API if not already loaded
        const initPlayer = () => {
            const player = new YT.Player(`yt-player-${lessonId}`, {
                videoId: videoId,
                playerVars: { 'rel': 0, 'modestbranding': 1 },
                events: {
                    'onReady': (event) => {
                        // Poll progress periodically
                        const interval = setInterval(() => {
                            if (player && player.getCurrentTime && player.getDuration) {
                                const current = player.getCurrentTime();
                                const duration = player.getDuration();
                                if (duration > 0) {
                                    const percent = (current / duration) * 100;
                                    this.updateLessonProgress(lessonId, percent);
                                    if (percent >= 99) clearInterval(interval);
                                }
                            }
                        }, 1000);
                        this.ytIntervals = this.ytIntervals || {};
                        this.ytIntervals[lessonId] = interval;
                    },
                    'onStateChange': (event) => {
                        if (event.data === YT.PlayerState.ENDED) {
                            this.updateLessonProgress(lessonId, 100);
                        }
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            // Load the API
            if (!document.getElementById('youtube-iframe-api')) {
                const tag = document.createElement('script');
                tag.id = 'youtube-iframe-api';
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
            // Queue the player init
            this.ytPlayerQueue = this.ytPlayerQueue || [];
            this.ytPlayerQueue.push(initPlayer);
            window.onYouTubeIframeAPIReady = () => {
                (this.ytPlayerQueue || []).forEach(fn => fn());
                this.ytPlayerQueue = [];
            };
        }
    },

    markExternalLinkVisited: function(lessonId) {
        // For non-embeddable external links, visiting counts as completion progress
        this.updateLessonProgress(lessonId, 100);
    },

    finishLesson: function(lessonId) {
        const percent = this.lessonProgress[lessonId] || 0;
        if (percent < 95) {
            alert('Vous devez consulter la totalite du contenu avant de terminer la lecon.');
            return;
        }

        const formData = new FormData();
        formData.append('lesson_id', lessonId);
        fetch('api.php?action=complete_lesson', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Felicitations ! Vous avez termine cette lecon.');
                this.loadCourseDetails(this.activeCourseId);
            } else {
                alert(data.message);
            }
        });
    },

    createCourse: function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        fetch('api.php?action=add_course', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                form.reset();
                this.loadDashboardStats();
            } else {
                alert(data.message);
            }
        });
    },

    createLesson: function(e, courseId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('course_id', courseId);

        fetch('api.php?action=add_lesson', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                form.reset();
                this.loadCourseDetails(courseId);
            } else {
                alert(data.message);
            }
        });
    },

    createEvaluation: function(e, lessonId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('lesson_id', lessonId);

        fetch('api.php?action=add_evaluation', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                this.loadCourseDetails(this.activeCourseId);
            } else {
                alert(data.message);
            }
        });
    },

    addQuizQuestion: function(e, evalId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('evaluation_id', evalId);

        fetch('api.php?action=add_quiz_question', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                form.reset();
                this.loadQuizQuestionsForTeacher(evalId);
            } else {
                alert(data.message);
            }
        });
    },

    loadQuizQuestionsForTeacher: function(evalId) {
        const div = document.getElementById(`quiz-questions-list-${evalId}`);
        if (!div) return;

        fetch(`api.php?action=get_quiz_questions&evaluation_id=${evalId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.questions.length > 0) {
                    let html = '<ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">';
                    data.questions.forEach((q, idx) => {
                        html += `
                            <li style="background: var(--bg-white); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 13px;">
                                <strong>Q${idx+1}: ${escapeHtml(q.question_text)}</strong> (${q.points} pts)
                                <br><span style="color: var(--text-muted);">A: ${escapeHtml(q.option_a)} | B: ${escapeHtml(q.option_b)} ${q.option_c ? '| C: ' + escapeHtml(q.option_c) : ''} ${q.option_d ? '| D: ' + escapeHtml(q.option_d) : ''}</span>
                            </li>
                        `;
                    });
                    html += '</ul>';
                    div.innerHTML = html;
                } else {
                    div.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Aucune question ajoutee pour ce quiz.</p>';
                }
            });
    },

    startQuiz: function(evalId) {
        const sidebar = document.getElementById('course-details-sidebar');
        sidebar.innerHTML = '<div class="content-panel"><p>Chargement des questions du quiz...</p></div>';

        fetch(`api.php?action=get_quiz_questions&evaluation_id=${evalId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.questions.length > 0) {
                    const formHtml = Components.renderQuizForm(data.questions, evalId);
                    sidebar.innerHTML = `
                        <div class="content-panel" style="border-top: 4px solid var(--accent-orange);">
                            <h2><i class="fas fa-pen-alt"></i> Quiz en cours</h2>
                            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Veuillez repondre a toutes les questions avant de valider.</p>
                            ${formHtml}
                        </div>
                    `;
                } else {
                    sidebar.innerHTML = `
                        <div class="content-panel">
                            <h3>Erreur</h3>
                            <p>Ce quiz ne contient aucune question ou n'est pas encore pret.</p>
                        </div>
                    `;
                }
            });
    },

    submitQuizAnswers: function(e, evalId) {
        e.preventDefault();
        const form = e.target;

        const answers = {};
        const radioInputs = form.querySelectorAll('input[type="radio"]:checked');
        radioInputs.forEach(input => {
            const match = input.name.match(/answers\[(\d+)\]/);
            if (match) {
                const questionId = match[1];
                answers[questionId] = input.value;
            }
        });

        fetch('api.php?action=submit_quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                evaluation_id: evalId,
                answers: answers
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(`Quiz valide ! Votre note : ${data.score} / ${data.max_points}`);
                this.loadCourseDetails(this.activeCourseId);
            } else {
                alert(data.message);
            }
        });
    },

    submitHomework: function(e, evalId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('evaluation_id', evalId);

        fetch('api.php?action=submit_homework', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                this.loadCourseDetails(this.activeCourseId);
            } else {
                alert(data.message);
            }
        });
    },

    loadHomeworksList: function() {
        if (this.user.role === 'teacher') {
            this.loadSubmissionsForGrading();
        } else {
            const wrapper = document.getElementById('student-homeworks-wrapper');
            wrapper.innerHTML = '<p style="padding: 20px;">Chargement des devoirs...</p>';

            fetch('api.php?action=get_student_grades')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.grades.length > 0) {
                        const homeworks = data.grades.filter(g => g.eval_type === 'homework');

                        if (homeworks.length > 0) {
                            let html = `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Matiere / Cours</th>
                                            <th>Devoir</th>
                                            <th>Soumission</th>
                                            <th>Note obtenue</th>
                                            <th>Feedback Enseignant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;

                            homeworks.forEach(hw => {
                                const statusLabel = hw.status === 'graded'
                                    ? `<strong class="orange-text">${hw.score} / ${hw.max_points}</strong>`
                                    : '<span class="badge badge-warning"><i class="fas fa-clock"></i> En attente de correction</span>';

                                html += `
                                    <tr>
                                        <td style="padding: 16px 20px;"><strong>${hw.subject_id}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(hw.course_title)}</span></td>
                                        <td style="padding: 16px 20px;">${escapeHtml(hw.eval_title)}</td>
                                        <td style="padding: 16px 20px; font-size: 12px; color: var(--text-muted);">Soumis le: ${formatDate(hw.submitted_at)}</td>
                                        <td style="padding: 16px 20px;">${statusLabel}</td>
                                        <td style="padding: 16px 20px; font-size: 13px;">${escapeHtml(hw.feedback || 'Aucun retour.')}</td>
                                    </tr>
                                `;
                            });

                            html += '</tbody></table>';
                            wrapper.innerHTML = html;
                        } else {
                            wrapper.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun devoir soumis pour le moment.</p>';
                        }
                    } else {
                        wrapper.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun devoir soumis pour le moment.</p>';
                    }
                });
        }
    },

    loadSubmissionsForGrading: function() {
        const body = document.getElementById('teacher-grading-tbody');
        const countSpan = document.getElementById('pending-grading-count');

        body.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">Chargement des copies...</td></tr>';

        fetch('api.php?action=get_submissions_for_grading')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.submissions.length > 0) {
                    let html = '';
                    const pendings = data.submissions.filter(s => s.status === 'pending');
                    countSpan.innerText = pendings.length;

                    data.submissions.forEach(sub => {
                        html += Components.renderGradingRow(sub);
                    });
                    body.innerHTML = html;
                } else {
                    countSpan.innerText = 0;
                    body.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">Aucune copie soumise pour le moment.</td></tr>';
                }
            });
    },

    submitGrade: function(e, subId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('submission_id', subId);

        fetch('api.php?action=grade_submission', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                this.loadSubmissionsForGrading();
            } else {
                alert(data.message);
            }
        });
    },

    loadQuizzesList: function() {
        const wrapper = document.getElementById('student-quizzes-wrapper');
        wrapper.innerHTML = '<p style="padding: 20px;">Chargement des resultats de quiz...</p>';

        fetch('api.php?action=get_student_grades')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.grades.length > 0) {
                    const quizzes = data.grades.filter(g => g.eval_type === 'quiz');
                    if (quizzes.length > 0) {
                        let html = `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Matiere / Cours</th>
                                        <th>Quiz</th>
                                        <th>Date d'execution</th>
                                        <th>Score obtenu</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;
                        quizzes.forEach(q => {
                            html += `
                                <tr>
                                    <td style="padding: 16px 20px;"><strong>${q.subject_id}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(q.course_title)}</span></td>
                                    <td style="padding: 16px 20px;">${escapeHtml(q.eval_title)}</td>
                                    <td style="padding: 16px 20px; font-size: 12px; color: var(--text-muted);">${formatDate(q.submitted_at)}</td>
                                    <td style="padding: 16px 20px; font-weight: 600;" class="orange-text">${q.score} / ${q.max_points}</td>
                                </tr>
                            `;
                        });
                        html += '</tbody></table>';
                        wrapper.innerHTML = html;
                    } else {
                        wrapper.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun quiz complete pour le moment.</p>';
                    }
                } else {
                    wrapper.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun quiz complete pour le moment.</p>';
                }
            });
    },

    loadNotesReport: function() {
        const bulletinDiv = document.getElementById('student-bulletin-wrapper');
        const modulesDiv = document.getElementById('student-modules-wrapper');

        bulletinDiv.innerHTML = '<p>Chargement des notes...</p>';
        modulesDiv.innerHTML = '<p>Chargement des certificats...</p>';

        fetch('api.php?action=get_student_grades')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.grades.length > 0) {
                    let html = `
                        <table>
                            <thead>
                                <tr>
                                    <th>Code Matiere</th>
                                    <th>Evaluation</th>
                                    <th>Type</th>
                                    <th style="text-align: center;">Note obtenu</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    data.grades.forEach(g => {
                        html += `
                            <tr>
                                <td style="padding: 10px 8px;"><strong>${g.subject_id}</strong></td>
                                <td style="padding: 10px 8px;">${escapeHtml(g.eval_title)}</td>
                                <td style="padding: 10px 8px;"><span class="badge ${g.eval_type === 'quiz' ? 'badge-blue' : 'badge-success'}">${g.eval_type}</span></td>
                                <td style="padding: 10px 8px; text-align: center; font-weight: 600;" class="orange-text">${g.score} / ${g.max_points}</td>
                            </tr>
                        `;
                    });
                    html += '</tbody></table>';
                    bulletinDiv.innerHTML = html;
                } else {
                    bulletinDiv.innerHTML = '<p style="color: var(--text-muted);">Aucune evaluation n\'a encore ete notee.</p>';
                }
            });

        fetch('api.php?action=get_modules')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.modules.length > 0) {
                    let html = '';
                    data.modules.forEach(mod => {
                        let subjectsHtml = '';
                        mod.subjects.forEach(s => {
                            subjectsHtml += `<span class="badge badge-blue" style="margin-right: 5px;">${s.id}</span>`;
                        });

                        let statusActionHtml = '';
                        if (mod.certificate) {
                            statusActionHtml = `
                                <div class="badge badge-success" style="margin-bottom: 10px;"><i class="fas fa-check-circle"></i> Certificat Valide</div>
                                <br>
                                <button class="btn btn-orange btn-sm" onclick="App.viewCertificate(${mod.id}, '${escapeHtml(mod.name)}', '${mod.certificate.hash_code}', '${mod.certificate.issued_at}')">
                                    <i class="fas fa-award"></i> Afficher le certificat
                                </button>
                            `;
                        } else {
                            statusActionHtml = `
                                <button class="btn btn-primary btn-sm" onclick="App.validateModule(${mod.id})">
                                    <i class="fas fa-trophy"></i> Demander la validation du module
                                </button>
                            `;
                        }

                        html += `
                            <div class="content-panel" style="margin-bottom: 20px; border-left: 5px solid var(--accent-orange);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px;">
                                    <div style="flex: 1;">
                                        <h3>${escapeHtml(mod.name)}</h3>
                                        <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${escapeHtml(mod.description)}</p>
                                        <div style="margin-top: 10px;">
                                            <span style="font-size: 12px; color: var(--text-dark); margin-right: 10px;">Matieres obligatoires:</span>
                                            ${subjectsHtml}
                                        </div>
                                    </div>
                                    <div style="text-align: right; min-width: 180px;">
                                        ${statusActionHtml}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    modulesDiv.innerHTML = html;
                } else {
                    modulesDiv.innerHTML = '<p style="color: var(--text-muted);">Aucun module de cours defini par le promoteur.</p>';
                }
            });
    },

    validateModule: function(moduleId) {
        const formData = new FormData();
        formData.append('module_id', moduleId);

        fetch('api.php?action=validate_module_certificate', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            this.loadNotesReport();
        });
    },

    viewCertificate: function(moduleId, moduleName, hashCode, issuedAt) {
        const modal = document.getElementById('certificate-modal');
        const container = document.getElementById('certificate-modal-body');

        const cert = {
            hash_code: hashCode,
            issued_at: issuedAt
        };

        container.innerHTML = Components.renderCertificatePreview(cert, moduleName, this.user.name);
        modal.style.display = 'flex';
    },

    createSubject: function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        fetch('api.php?action=add_subject', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                form.reset();
                this.loadDashboardStats();
            } else {
                alert(data.message);
            }
        });
    },

    createModule: function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        fetch('api.php?action=add_module', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                form.reset();
                this.loadDashboardStats();
            } else {
                alert(data.message);
            }
        });
    },

    loadMessagesInbox: function() {
        const listDiv = document.getElementById('messages-list-wrapper');
        listDiv.innerHTML = '<p>Chargement des messages...</p>';

        fetch('api.php?action=get_messages')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.messages.length > 0) {
                    let html = '';
                    data.messages.forEach(msg => {
                        html += Components.renderMessageItem(msg, this.user.id);
                    });
                    listDiv.innerHTML = html;
                } else {
                    listDiv.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun message recu ou envoye.</p>';
                }
            });
    },

    openNewMessageModal: function() {
        document.getElementById('new-message-modal').style.display = 'flex';
    },

    closeNewMessageModal: function() {
        document.getElementById('new-message-modal').style.display = 'none';
        document.getElementById('new-message-form').reset();
    },

    sendMessage: function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        fetch('api.php?action=send_message', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                this.closeNewMessageModal();
                this.loadMessagesInbox();
            } else {
                alert(data.message);
            }
        });
    },

    openMessageDetails: function(msg) {
        alert(`Sujet : ${msg.subject}\nMessage :\n\n${msg.body}`);
    },

    loadCalendarEvents: function() {
        const wrapper = document.getElementById('calendar-events-wrapper');
        wrapper.innerHTML = '<p>Chargement du calendrier...</p>';

        fetch('api.php?action=get_calendar_events')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.events.length > 0) {
                    let html = '';
                    const grouped = {};
                    data.events.forEach(ev => {
                        const dateKey = formatDate(ev.date).split(' ')[0];
                        if (!grouped[dateKey]) grouped[dateKey] = [];
                        grouped[dateKey].push(ev);
                    });
                    Object.keys(grouped).forEach(date => {
                        html += `<div style="margin-bottom: 16px;">
                            <div style="font-weight: 600; font-size: 14px; color: var(--primary-blue); margin-bottom: 8px; padding: 6px 12px; background: var(--primary-blue-light); border-radius: 6px; display: inline-block;">
                                <i class="fas fa-calendar-day"></i> ${date}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px; margin-left: 12px;">`;
                        grouped[date].forEach(ev => {
                            const icon = ev.type === 'quiz' ? 'fa-question-circle' : ev.type === 'homework' ? 'fa-file-alt' : 'fa-book';
                            const color = ev.type === 'quiz' ? 'var(--accent-orange)' : ev.type === 'homework' ? 'var(--success)' : 'var(--primary-blue)';
                            html += `
                                <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-white); border-radius: 8px; border: 1px solid var(--border-color);">
                                    <div style="width: 36px; height: 36px; border-radius: 8px; background: var(--bg-light); display: flex; align-items: center; justify-content: center; color: ${color};">
                                        <i class="fas ${icon}"></i>
                                    </div>
                                    <div>
                                        <strong style="font-size: 14px;">${escapeHtml(ev.title)}</strong>
                                        ${ev.subject ? `<br><span style="font-size: 11px; color: var(--text-muted);">${ev.subject}</span>` : ''}
                                    </div>
                                </div>`;
                        });
                        html += `</div></div>`;
                    });
                    wrapper.innerHTML = html;
                } else {
                    wrapper.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Aucun evenement pour le moment.</p>';
                }
            });
    },

    loadPromoterOverview: function() {
        const wrapper = document.getElementById('promoter-overview-wrapper');
        wrapper.innerHTML = '<p>Chargement des statistiques...</p>';

        fetch('api.php?action=get_promoter_grades_overview')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.students.length > 0) {
                    let html = `
                        <table>
                            <thead>
                                <tr>
                                    <th>Etudiant</th>
                                    <th>Total Soumissions</th>
                                    <th>Moyenne Generale</th>
                                    <th>Meilleure Note</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    data.students.forEach(s => {
                        const avg = s.avg_score ? parseFloat(s.avg_score).toFixed(2) : 'N/A';
                        const avgColor = s.avg_score >= 12 ? 'var(--success)' : 'var(--danger)';
                        html += `
                            <tr>
                                <td style="padding: 12px;"><strong>${escapeHtml(s.student_name)}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${s.student_email}</span></td>
                                <td style="padding: 12px;"><span class="badge badge-blue">${s.total_submissions}</span></td>
                                <td style="padding: 12px; font-weight: 600; color: ${avgColor};">${avg}</td>
                                <td style="padding: 12px; font-weight: 600;" class="orange-text">${s.best_score ? parseFloat(s.best_score).toFixed(2) : 'N/A'}</td>
                            </tr>
                        `;
                    });
                    html += '</tbody></table>';
                    wrapper.innerHTML = html;
                } else {
                    wrapper.innerHTML = '<p style="color: var(--text-muted);">Aucune donnee disponible pour le moment.</p>';
                }
            });
    },

    // --- USER MANAGEMENT (Promoter) ---
    loadUsersList: function() {
        const wrapper = document.getElementById('users-list-wrapper');
        const countSpan = document.getElementById('users-total-count');
        wrapper.innerHTML = '<p style="padding: 20px;">Chargement des utilisateurs...</p>';

        const search = document.getElementById('users-search-input') ? document.getElementById('users-search-input').value : '';
        const roleFilter = document.getElementById('users-role-filter') ? document.getElementById('users-role-filter').value : '';

        let url = 'api.php?action=get_users';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (roleFilter) url += `&role=${encodeURIComponent(roleFilter)}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.users.length > 0) {
                    let html = `
                        <table>
                            <thead>
                                <tr>
                                    <th style="padding: 12px 16px;">Utilisateur</th>
                                    <th style="padding: 12px 16px;">Courriel</th>
                                    <th style="padding: 12px 16px;">Role</th>
                                    <th style="padding: 12px 16px;">Membre depuis</th>
                                    <th style="padding: 12px 16px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    data.users.forEach(u => {
                        html += Components.renderUserRow(u);
                    });
                    html += '</tbody></table>';
                    wrapper.innerHTML = html;
                    if (countSpan) countSpan.innerText = data.users.length;
                } else {
                    wrapper.innerHTML = '<p style="color: var(--text-muted); padding: 40px; text-align: center;">Aucun utilisateur trouve.</p>';
                    if (countSpan) countSpan.innerText = 0;
                }
            })
            .catch(err => {
                wrapper.innerHTML = '<p class="orange-text">Erreur de chargement des utilisateurs.</p>';
            });
    },

    openAddUserModal: function() {
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const body = document.getElementById('user-modal-body');
        
        title.innerText = 'Ajouter un Utilisateur';
        body.innerHTML = Components.renderUserForm(null);
        modal.style.display = 'flex';
    },

    openEditUserModal: function(userId) {
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const body = document.getElementById('user-modal-body');
        
        title.innerText = 'Chargement...';
        body.innerHTML = '<p style="padding: 20px; text-align: center;">Chargement des informations...</p>';
        modal.style.display = 'flex';

        fetch(`api.php?action=get_user_details&user_id=${userId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    title.innerText = 'Modifier l\'utilisateur';
                    body.innerHTML = Components.renderUserForm(data.user);
                } else {
                    alert(data.message);
                    modal.style.display = 'none';
                }
            })
            .catch(err => {
                alert('Erreur de chargement.');
                modal.style.display = 'none';
            });
    },

    closeUserModal: function() {
        document.getElementById('user-modal').style.display = 'none';
    },

    submitUserForm: function(e, userId) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const isEdit = userId !== null && userId !== undefined && userId !== 'null';
        const action = isEdit ? 'update_user' : 'add_user';

        if (isEdit) {
            // For update, send as JSON
            const data = {
                user_id: userId,
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role'),
                password: formData.get('password') || ''
            };

            fetch('api.php?action=update_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    this.closeUserModal();
                    this.loadUsersList();
                } else {
                    alert(data.message);
                }
            });
        } else {
            fetch('api.php?action=add_user', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    this.closeUserModal();
                    this.loadUsersList();
                } else {
                    alert(data.message);
                }
            });
        }
    },

    deleteUser: function(userId, userName) {
        if (!confirm(`Voulez-vous vraiment supprimer l'utilisateur "${userName}" ?\n\nCette action est irreversible. Toutes les donnees liees (cours, soumissions, etc.) seront egalement supprimees.`)) {
            return;
        }

        const formData = new FormData();
        formData.append('user_id', userId);

        fetch('api.php?action=delete_user', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                this.loadUsersList();
                // If we were viewing details, go back to list
                if (this.activeTab === 'user-details') {
                    this.switchTab('users');
                }
            } else {
                alert(data.message);
            }
        });
    },

    viewUserDetails: function(userId) {
        this.activeUserId = userId;
        this.switchTab('user-details');
        
        const container = document.getElementById('user-details-container');
        container.innerHTML = '<p style="padding: 20px;">Chargement des details...</p>';

        fetch(`api.php?action=get_user_details&user_id=${userId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    container.innerHTML = Components.renderUserDetails(data.user);
                } else {
                    container.innerHTML = `<div class="alert-banner alert-banner-danger">${data.message}</div>`;
                }
            })
            .catch(err => {
                container.innerHTML = '<p class="orange-text">Erreur de chargement.</p>';
            });
    },

    filterUsers: function() {
        this.loadUsersList();
    },

    loadUserProfile: function() {
        const section = document.getElementById('profile-details-wrapper');
        section.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="user-avatar-wrap" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto 20px auto;">
                    ${this.user.name.charAt(0).toUpperCase()}
                </div>
                <h2>${escapeHtml(this.user.name)}</h2>
                <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 15px; text-transform: capitalize;">
                    <i class="fas fa-user-tag"></i> Role : ${this.user.role}
                </p>
                <div style="max-width: 400px; margin: 0 auto; text-align: left; background: var(--bg-light); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary-blue-light); display: flex; align-items: center; justify-content: center; color: var(--primary-blue);">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">Adresse Courriel</span>
                            <br><strong style="font-size: 15px;">${escapeHtml(this.user.email)}</strong>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--accent-orange-light); display: flex; align-items: center; justify-content: center; color: var(--accent-orange);">
                            <i class="fas fa-id-card"></i>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">Identifiant unique (ID)</span>
                            <br><strong style="font-size: 15px;"># ${this.user.id}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    logout: function() {
        fetch('auth.php?action=logout')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = 'index.php';
                }
            });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
