const Components = {
    renderSubjectOption: function(subject) {
        return `<option value="${subject.id}">${subject.id} - ${subject.name}</option>`;
    },

    renderCourseCard: function(course, role) {
        const progressHtml = role === 'student' ? `
            <div class="course-progress-bar">
                <div class="course-progress-fill" style="width: ${course.progress_percent || 0}%"></div>
            </div>
            <div class="course-progress-text">
                <span>Progression</span>
                <strong>${course.progress_percent || 0}%</strong>
            </div>
        ` : '';

        return `
            <div class="course-card">
                <div class="course-card-header">
                    <span class="course-card-subject">${course.subject_id}</span>
                    <h3>${escapeHtml(course.title)}</h3>
                </div>
                <div class="course-card-body">
                    <p>${escapeHtml(course.description || 'Aucune description fournie.')}</p>
                    <div class="course-card-teacher">
                        <span>Enseignant: <strong>${escapeHtml(course.teacher_name)}</strong></span>
                    </div>
                    ${progressHtml}
                    <button class="btn btn-primary" onclick="App.viewCourse(${course.id})">
                        <i class="fas fa-eye"></i> Voir le cours
                    </button>
                </div>
            </div>
        `;
    },

    renderLessonRow: function(lesson, role) {
        let typeIcon = '<i class="fas fa-file-pdf"></i>';
        if (lesson.content_type === 'video') typeIcon = '<i class="fas fa-video"></i>';
        if (lesson.content_type === 'link') typeIcon = '<i class="fas fa-link"></i>';

        let statusBadge = '';
        if (role === 'student') {
            statusBadge = lesson.completed
                ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Complete</span>'
                : '<span class="badge badge-warning"><i class="fas fa-clock"></i> En cours</span>';
        }

        let evalBadge = '';
        if (lesson.evaluation) {
            const typeLabel = lesson.evaluation.type === 'quiz' ? 'Quiz' : 'Devoir';
            evalBadge = `<span class="badge badge-blue"><i class="fas fa-tasks"></i> ${typeLabel}</span>`;
        }

        return `
            <div class="lesson-row">
                <div class="lesson-info">
                    <div class="lesson-icon">${typeIcon}</div>
                    <div class="lesson-info-text">
                        <h4>Lecon ${lesson.order_index}: ${escapeHtml(lesson.title)}</h4>
                        <p>${escapeHtml(lesson.description || '')}</p>
                        <div style="display: flex; gap: 8px; margin-top: 5px;">
                            ${statusBadge}
                            ${evalBadge}
                        </div>
                    </div>
                </div>
                <div class="lesson-actions">
                    <button class="btn btn-outline btn-sm" onclick="App.openLessonContent(${lesson.id})">
                        <i class="fas fa-folder-open"></i> Ouvrir
                    </button>
                </div>
            </div>
        `;
    },

    renderEvaluationSection: function(lesson, role) {
        if (!lesson.evaluation) {
            if (role === 'teacher') {
                return `
                    <div class="content-panel" style="border-left: 4px solid var(--accent-orange);">
                        <h3>Creer une evaluation pour cette lecon</h3>
                        <p style="margin-bottom: 15px; color: var(--text-muted);">
                            Ajoutez un Quiz a choix multiples ou un Devoir a soumettre pour valider cette lecon.
                        </p>
                        <form onsubmit="App.createEvaluation(event, ${lesson.id})">
                            <div class="form-group">
                                <label>Type d'evaluation</label>
                                <select name="type" class="form-control">
                                    <option value="quiz">Quiz Interactif</option>
                                    <option value="homework">Depot de devoir (PDF/ZIP)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Titre de l'evaluation</label>
                                <input type="text" name="title" class="form-control" placeholder="Ex: Quiz de revision chapitre 1" required>
                            </div>
                            <div class="form-group">
                                <label>Consignes / Description</label>
                                <textarea name="description" class="form-control" rows="3" placeholder="Saisissez les instructions pour les etudiants..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label>Note Maximale (points)</label>
                                <input type="number" name="max_points" class="form-control" value="20" required>
                            </div>
                            <button type="submit" class="btn btn-orange"><i class="fas fa-save"></i> Enregistrer l'evaluation</button>
                        </form>
                    </div>
                `;
            }
            return '';
        }

        const evaluation = lesson.evaluation;
        const sub = lesson.submission;

        if (role === 'student') {
            let statusHtml = '';
            let actionHtml = '';

            if (sub) {
                if (sub.status === 'graded') {
                    const gradeIcon = parseFloat(sub.score) >= (parseFloat(evaluation.max_points) * 0.6) ? 'success' : 'danger';
                    statusHtml = `
                        <div class="alert-banner alert-banner-success" style="margin-top: 15px;">
                            <span><i class="fas fa-star"></i> Note obtenue : <strong>${sub.score} / ${evaluation.max_points}</strong></span>
                            <span class="badge badge-${gradeIcon}">Note attribuee</span>
                        </div>
                        ${sub.feedback ? `<div style="background: var(--bg-light); padding: 12px; margin-top: 10px; border-radius: 6px; font-size: 13px;"><strong><i class="fas fa-comment"></i> Commentaire de l'enseignant :</strong> ${escapeHtml(sub.feedback)}</div>` : ''}
                    `;
                } else {
                    statusHtml = `
                        <div class="alert-banner" style="margin-top: 15px; background-color: var(--warning-light); border-color: var(--warning); color: var(--text-dark);">
                            <span><i class="fas fa-hourglass-half"></i> Travail soumis. En attente de correction par l'enseignant.</span>
                            <span class="badge badge-warning">En attente</span>
                        </div>
                    `;
                }
            } else {
                statusHtml = `
                    <div style="margin-top: 15px;">
                        <span class="badge badge-danger"><i class="fas fa-times-circle"></i> Non soumis</span>
                    </div>
                `;

                if (evaluation.type === 'quiz') {
                    actionHtml = `
                        <button class="btn btn-orange" style="margin-top: 15px;" onclick="App.startQuiz(${evaluation.id})">
                            <i class="fas fa-pen"></i> Commencer le Quiz (${evaluation.questions_count || 0} questions)
                        </button>
                    `;
                } else {
                    actionHtml = `
                        <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                            <h4>Soumettre votre devoir</h4>
                            <form onsubmit="App.submitHomework(event, ${evaluation.id})" enctype="multipart/form-data" style="margin-top: 10px;">
                                <div class="form-group">
                                    <label>Commentaire / Reponse en texte</label>
                                    <textarea name="submission_text" class="form-control" rows="3" placeholder="Ecrivez vos commentaires ou collez un lien de depot..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Fichier joint (PDF ou ZIP)</label>
                                    <input type="file" name="submission_file" class="form-control" accept=".pdf,.zip,.rar,.txt">
                                </div>
                                <button type="submit" class="btn btn-orange"><i class="fas fa-upload"></i> Envoyer ma soumission</button>
                            </form>
                        </div>
                    `;
                }
            }

            return `
                <div class="content-panel" style="border-left: 4px solid var(--primary-blue);">
                    <h3><i class="fas fa-clipboard-list"></i> Evaluation : ${escapeHtml(evaluation.title)}</h3>
                    <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
                        ${escapeHtml(evaluation.description)}
                    </p>
                    ${statusHtml}
                    ${actionHtml}
                </div>
            `;
        }

        if (role === 'teacher') {
            let questionEditorHtml = '';
            if (evaluation.type === 'quiz') {
                questionEditorHtml = `
                    <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <h4><i class="fas fa-list"></i> Questions de ce Quiz</h4>
                        <div id="quiz-questions-list-${evaluation.id}" style="margin: 15px 0;">Chargement des questions...</div>

                        <h5 style="margin-top: 15px;"><i class="fas fa-plus-circle"></i> Ajouter une question a choix multiples</h5>
                        <form onsubmit="App.addQuizQuestion(event, ${evaluation.id})" style="margin-top: 10px; background: var(--bg-light); padding: 15px; border-radius: 8px;">
                            <div class="form-group">
                                <label>Intitule de la question</label>
                                <input type="text" name="question_text" class="form-control" placeholder="Saisissez la question..." required>
                            </div>
                            <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>
                                    <label>Option A</label>
                                    <input type="text" name="option_a" class="form-control" required>
                                </div>
                                <div>
                                    <label>Option B</label>
                                    <input type="text" name="option_b" class="form-control" required>
                                </div>
                                <div>
                                    <label>Option C</label>
                                    <input type="text" name="option_c" class="form-control">
                                </div>
                                <div>
                                    <label>Option D</label>
                                    <input type="text" name="option_d" class="form-control">
                                </div>
                            </div>
                            <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>
                                    <label>Bonne Option</label>
                                    <select name="correct_option" class="form-control">
                                        <option value="A">Option A</option>
                                        <option value="B">Option B</option>
                                        <option value="C">Option C</option>
                                        <option value="D">Option D</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Valeur (points)</label>
                                    <input type="number" name="points" class="form-control" value="5" required>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-orange btn-sm"><i class="fas fa-plus"></i> Ajouter la question</button>
                        </form>
                    </div>
                `;
            }

            return `
                <div class="content-panel" style="border-left: 4px solid var(--primary-blue);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3><i class="fas fa-clipboard-check"></i> Evaluation : ${escapeHtml(evaluation.title)}</h3>
                        <span class="badge badge-blue">${evaluation.type.toUpperCase()}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
                        ${escapeHtml(evaluation.description)}
                    </p>
                    <p style="font-size: 13px; margin-top: 5px;">
                        Note Maximale : <strong>${evaluation.max_points} points</strong>
                    </p>
                    ${questionEditorHtml}
                </div>
            `;
        }

        return '';
    },

    renderQuizForm: function(questions, evalId) {
        let html = `
            <form onsubmit="App.submitQuizAnswers(event, ${evalId})">
                <input type="hidden" name="evaluation_id" value="${evalId}">
        `;

        questions.forEach((q, idx) => {
            html += `
                <div class="quiz-question-box">
                    <p>
                        Q${idx + 1}. ${escapeHtml(q.question_text)} <span style="font-weight: normal; font-size: 12px; color: var(--text-muted);">(${q.points} pts)</span>
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-left: 10px;">
                        <label>
                            <input type="radio" name="answers[${q.id}]" value="A" required>
                            <span>A. ${escapeHtml(q.option_a)}</span>
                        </label>
                        <label>
                            <input type="radio" name="answers[${q.id}]" value="B">
                            <span>B. ${escapeHtml(q.option_b)}</span>
                        </label>
                        ${q.option_c ? `
                        <label>
                            <input type="radio" name="answers[${q.id}]" value="C">
                            <span>C. ${escapeHtml(q.option_c)}</span>
                        </label>
                        ` : ''}
                        ${q.option_d ? `
                        <label>
                            <input type="radio" name="answers[${q.id}]" value="D">
                            <span>D. ${escapeHtml(q.option_d)}</span>
                        </label>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += `
                <button type="submit" class="btn btn-orange"><i class="fas fa-check-circle"></i> Soumettre le Quiz</button>
            </form>
        `;
        return html;
    },

    renderMessageItem: function(msg, currentUserId) {
        const isSender = parseInt(msg.sender_id) === currentUserId;
        const unreadClass = (!msg.is_read && !isSender) ? 'unread' : '';
        const directionLabel = isSender
            ? `<i class="fas fa-arrow-right" style="color: var(--text-muted);"></i> A : ${escapeHtml(msg.receiver_name)}`
            : `<i class="fas fa-arrow-left" style="color: var(--accent-orange);"></i> De : ${escapeHtml(msg.sender_name)} (${msg.sender_role})`;

        return `
            <div class="message-item ${unreadClass}" onclick="App.openMessageDetails(${JSON.stringify(msg).replace(/"/g, '&quot;')})">
                <div class="message-item-header">
                    <span class="message-sender">${directionLabel}</span>
                    <span class="message-date">${formatDate(msg.created_at)}</span>
                </div>
                <div class="message-subject">${escapeHtml(msg.subject)}</div>
                <div class="message-body">${escapeHtml(msg.body)}</div>
            </div>
        `;
    },

    renderGradingRow: function(sub) {
        const fileLink = sub.file_path
            ? `<a href="${sub.file_path}" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-download"></i> Telecharger</a>`
            : 'Aucun fichier';

        let actionColumn = '';
        if (sub.status === 'pending') {
            actionColumn = `
                <form onsubmit="App.submitGrade(event, ${sub.id})" style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <input type="number" step="0.25" min="0" max="${sub.max_points}" name="score" class="form-control" style="width: 70px; padding: 6px;" placeholder="/${sub.max_points}" required>
                    <input type="text" name="feedback" class="form-control" style="width: 140px; padding: 6px;" placeholder="Commentaire...">
                    <button type="submit" class="btn btn-orange btn-sm"><i class="fas fa-check"></i> Noter</button>
                </form>
            `;
        } else {
            actionColumn = `
                <div style="font-size: 13px;">
                    <span class="badge badge-success"><i class="fas fa-check-circle"></i> ${sub.score} / ${sub.max_points}</span>
                    <br>
                    <span style="color: var(--text-muted); font-size: 11px;">Feedback: ${escapeHtml(sub.feedback || '')}</span>
                </div>
            `;
        }

        return `
            <tr>
                <td style="padding: 12px; font-size: 14px;"><strong>${escapeHtml(sub.student_name)}</strong><br><span style="color: var(--text-muted); font-size: 11px;">${sub.student_email}</span></td>
                <td style="padding: 12px; font-size: 13px;">${escapeHtml(sub.course_title)}<br><span style="color: var(--text-muted); font-size: 11px;">${escapeHtml(sub.evaluation_title)}</span></td>
                <td style="padding: 12px; font-size: 13px;">${escapeHtml(sub.submission_text || '')}</td>
                <td style="padding: 12px; text-align: center;">${fileLink}</td>
                <td style="padding: 12px;">${actionColumn}</td>
            </tr>
        `;
    },

    renderUserRow: function(user) {
        const roleBadge = user.role === 'student' ? 'badge-blue' : user.role === 'teacher' ? 'badge-success' : 'badge-warning';
        const roleLabel = user.role === 'student' ? 'Etudiant' : user.role === 'teacher' ? 'Enseignant' : 'Promoteur';
        
        let statsHtml = '';
        if (user.role === 'teacher' && user.courses_count !== undefined) {
            statsHtml = `<span style="font-size: 11px; color: var(--text-muted);">${user.courses_count} cours</span>`;
        } else if (user.role === 'student') {
            statsHtml = `<span style="font-size: 11px; color: var(--text-muted);">${user.submissions_count || 0} soumissions${user.avg_grade ? ' | Moy: ' + user.avg_grade + '/20' : ''}</span>`;
        }

        return `
            <tr>
                <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="user-avatar-wrap" style="width: 36px; height: 36px; font-size: 14px; min-width: 36px;">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong style="font-size: 14px;">${escapeHtml(user.name)}</strong>
                            <br>${statsHtml}
                        </div>
                    </div>
                </td>
                <td style="padding: 12px 16px; font-size: 13px; color: var(--text-muted);">${escapeHtml(user.email)}</td>
                <td style="padding: 12px 16px;"><span class="badge ${roleBadge}">${roleLabel}</span></td>
                <td style="padding: 12px 16px; font-size: 12px; color: var(--text-muted);">${formatDate(user.created_at)}</td>
                <td style="padding: 12px 16px;">
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-outline btn-sm" onclick="App.viewUserDetails(${user.id})" title="Voir details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="App.openEditUserModal(${user.id})" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="App.deleteUser(${user.id}, '${escapeHtml(user.name)}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    renderUserForm: function(user) {
        const isEdit = !!user;
        const name = user ? escapeHtml(user.name) : '';
        const email = user ? escapeHtml(user.email) : '';
        const role = user ? user.role : 'student';
        
        return `
            <form id="user-form" onsubmit="App.submitUserForm(event, ${isEdit ? user.id : 'null'})">
                <div class="form-group">
                    <label><i class="fas fa-user" style="margin-right: 6px; color: var(--text-muted);"></i> Nom complet</label>
                    <input type="text" name="name" class="form-control" placeholder="Jean Dupont" value="${name}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-envelope" style="margin-right: 6px; color: var(--text-muted);"></i> Adresse Courriel</label>
                    <input type="email" name="email" class="form-control" placeholder="nom@exemple.com" value="${email}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-lock" style="margin-right: 6px; color: var(--text-muted);"></i> Mot de passe ${isEdit ? '(laisser vide pour ne pas changer)' : ''}</label>
                    <input type="password" name="password" class="form-control" placeholder="${isEdit ? 'Nouveau mot de passe...' : 'Minimum 6 caracteres'}" ${isEdit ? '' : 'required'}>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-user-tag" style="margin-right: 6px; color: var(--text-muted);"></i> Role</label>
                    <select name="role" class="form-control" required>
                        <option value="student" ${role === 'student' ? 'selected' : ''}>Etudiant(e)</option>
                        <option value="teacher" ${role === 'teacher' ? 'selected' : ''}>Enseignant(e)</option>
                        <option value="promoter" ${role === 'promoter' ? 'selected' : ''}>Promoteur / Administrateur</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-orange" style="width: 100%; margin-top: 8px;">
                    <i class="fas fa-${isEdit ? 'save' : 'user-plus'}"></i> ${isEdit ? 'Enregistrer les modifications' : 'Creer l\'utilisateur'}
                </button>
            </form>
        `;
    },

    renderUserDetails: function(user) {
        const roleLabel = user.role === 'student' ? 'Etudiant' : user.role === 'teacher' ? 'Enseignant' : 'Promoteur';
        const roleBadge = user.role === 'student' ? 'badge-blue' : user.role === 'teacher' ? 'badge-success' : 'badge-warning';
        
        let extraStatsHtml = '';
        
        if (user.role === 'teacher') {
            let coursesHtml = '';
            if (user.courses_list && user.courses_list.length > 0) {
                coursesHtml = '<ul style="list-style: none; margin-top: 10px;">';
                user.courses_list.forEach(c => {
                    coursesHtml += `
                        <li style="padding: 8px 12px; background: var(--bg-white); border-radius: 6px; margin-bottom: 6px; border: 1px solid var(--border-color); font-size: 13px;">
                            <strong>${escapeHtml(c.title)}</strong>
                            <span style="color: var(--text-muted);"> (${c.subject_id})</span>
                            <br><span style="font-size: 11px; color: var(--text-muted);">Cree le ${formatDate(c.created_at)}</span>
                        </li>
                    `;
                });
                coursesHtml += '</ul>';
            } else {
                coursesHtml = '<p style="color: var(--text-muted); font-size: 13px;">Aucun cours cree.</p>';
            }
            
            extraStatsHtml = `
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-light); border-radius: 8px;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-chalkboard-teacher"></i> Cours crees (${user.courses_count || 0})</h4>
                    ${coursesHtml}
                </div>
            `;
        } else if (user.role === 'student') {
            extraStatsHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
                    <div style="padding: 16px; background: var(--bg-light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--primary-blue);">${user.submissions_count || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Soumissions</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg-light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-orange);">${user.avg_grade !== null ? user.avg_grade + '/20' : 'N/A'}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Moyenne Generale</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg-light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--success);">${user.certificates_count || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Certificats</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg-light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--primary-blue);">${user.completed_lessons || 0}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Lecons completes</div>
                    </div>
                </div>
            `;
        }

        return `
            <div style="text-align: center; padding: 20px;">
                <div class="user-avatar-wrap" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto 20px auto;">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <h2>${escapeHtml(user.name)}</h2>
                <p style="color: var(--text-muted); margin-bottom: 5px; font-size: 15px;">
                    <i class="fas fa-envelope"></i> ${escapeHtml(user.email)}
                </p>
                <p style="margin-bottom: 20px;">
                    <span class="badge ${roleBadge}" style="font-size: 13px; padding: 6px 16px;">${roleLabel}</span>
                </p>
                <div style="max-width: 500px; margin: 0 auto; text-align: left;">
                    <div style="padding: 12px; background: var(--bg-light); border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">ID Utilisateur</span>
                        <strong>#${user.id}</strong>
                    </div>
                    <div style="padding: 12px; background: var(--bg-light); border-radius: 8px; display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Membre depuis</span>
                        <strong>${formatDate(user.created_at)}</strong>
                    </div>
                    ${extraStatsHtml}
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="App.openEditUserModal(${user.id})">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-danger" onclick="App.deleteUser(${user.id}, '${escapeHtml(user.name)}')">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    },

    renderCertificatePreview: function(cert, moduleName, studentName) {
        return `
            <div class="certificate-preview-box">
                <div class="certificate-seal">
                    <i class="fas fa-award"></i>
                </div>
                <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: var(--text-muted);">Certificat de Reussite</div>
                <div style="margin: 16px 0; font-size: 14px; color: var(--text-muted);">Ce document atteste que l'etudiant(e)</div>
                <div class="cert-student">${escapeHtml(studentName)}</div>
                <div style="font-size: 14px; color: var(--text-muted); margin: 12px 0;">a valide avec succes toutes les exigences du module de cours :</div>
                <div class="cert-module">${escapeHtml(moduleName)}</div>
                <div style="margin-top: 24px; font-size: 13px; color: var(--text-muted);"><i class="fas fa-calendar-alt"></i> Delivre le : ${formatDate(cert.issued_at)}</div>
                <div class="cert-hash"><i class="fas fa-shield-alt"></i> Code de verification : ${cert.hash_code}</div>
            </div>
        `;
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
