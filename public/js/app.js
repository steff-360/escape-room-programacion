const api = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
  } catch {
    const error = new Error('No se pudo conectar con el servidor de cuentas. Puedes jugar en este dispositivo con «Partida rápida», pero para registrarte o iniciar sesión necesitas abrir la aplicación publicada con su servidor.');
    error.apiUnavailable = true;
    throw error;
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const error = new Error('Este sitio no está conectado al servidor de cuentas. Puedes jugar en este dispositivo con «Partida rápida», pero para registrarte o iniciar sesión necesitas abrir la aplicación publicada con su servidor.');
    error.status = response.status;
    error.apiUnavailable = true;
    throw error;
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible completar la solicitud.');
    error.status = response.status;
    throw error;
  }
  return data;
};

const $ = (id) => document.getElementById(id);
const views = ['auth-view', 'student-view', 'admin-view'];
let missions = [];
let completed = [];
let codeParts = [];
let currentIndex = 0;
let selectedOption = null;
let currentUser = null;
let localMode = false;
let localTeamName = '';
let localPlayerName = '';
let memoryCards = [];
let flippedCards = [];
let matchedPairs = 0;
let memoryLocked = false;
let hintUnlocked = false;
let memoryGeneration = 0;
const localProgressPrefix = 'escape-room-local-progress:';
const localMissions = [
  { number: 1, title: 'La secuencia misteriosa', category: 'Pensamiento lógico', story: 'La primera puerta tiene una secuencia incompleta. Descubre el patrón.', question: '¿Qué número continúa esta secuencia? 2, 4, 8, 16, ___', options: ['18', '24', '32', '30'], answer: 2, codePart: 'N', hint: 'Cada número se multiplica por 2.', explanation: 'Cada número es el doble del anterior.' },
  { number: 2, title: 'El robot perdido', category: 'Algoritmos', story: 'Un robot necesita llegar a la salida. Solo entiende instrucciones ordenadas.', question: '¿Cuál es el orden lógico para comenzar a trabajar en una computadora?', options: ['Abrir programa → Encender → Conectar energía', 'Conectar energía → Encender → Abrir programa', 'Encender → Desconectar → Abrir programa', 'Abrir programa → Desconectar energía → Encender'], answer: 1, codePart: 'O', hint: 'Primero necesita energía, después encenderse y finalmente abrir el programa.', explanation: 'Una secuencia de instrucciones debe respetar el orden de ejecución.' },
  { number: 3, title: 'El mensaje oculto', category: 'JavaScript', story: 'El sistema dejó un mensaje en una variable. Calcula el resultado.', question: 'let edad = 20;\nconsole.log(edad + 5);\n¿Qué resultado mostrará?', options: ['20', '25', '205', 'Error'], answer: 1, codePart: 'D', hint: 'El operador + suma números cuando ambos valores son numéricos.', explanation: 'La suma de 20 + 5 es 25.' },
  { number: 4, title: 'El error del sistema', category: 'Depuración', story: 'Una condición debe comprobar si una persona tiene 18 años o más.', question: '¿Cuál condición es correcta en JavaScript?', options: ['if (edad = 18)', 'if (edad => 18)', 'if (edad >= 18)', 'if (edad < 18)'], answer: 2, codePart: 'E', hint: 'El operador de mayor o igual es >=.', explanation: 'El operador >= compara si un valor es mayor o igual a otro.' },
  { number: 5, title: 'La última llave', category: 'Bases de datos', story: 'La puerta final necesita consultar todos los registros de una tabla estudiantes.', question: '¿Qué consulta SQL es correcta?', options: ['GET ALL estudiantes;', 'SELECT * FROM estudiantes;', 'OPEN estudiantes;', 'SHOW estudiantes ALL;'], answer: 1, codePart: '5', hint: 'SELECT consulta datos y el asterisco representa todas las columnas.', explanation: 'SELECT * FROM estudiantes consulta todas las columnas de la tabla.' }
];

function showView(viewId) {
  views.forEach(id => $(id).classList.toggle('hidden', id !== viewId));
}

function showMessage(id, message, type = '') {
  const element = $(id);
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function getLocalProgressKey() {
  return `${localProgressPrefix}${localPlayerName.trim().toLocaleLowerCase()}`;
}

$('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('register-message', 'Creando cuenta...');
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const result = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showMessage('register-message', result.message, 'success');
    await loadCurrentUser();
  } catch (error) {
    showMessage('register-message', error.message.includes('No se pudo conectar') ? 'Servidor de cuentas no disponible. Usa «Partida rápida» abajo para jugar al instante.' : error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('login-message', 'Verificando acceso...');
  const form = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    localMode = false;
    await loadCurrentUser();
  } catch (error) {
    showMessage('login-message', error.message.includes('No se pudo conectar') ? 'Servidor de cuentas no disponible. Usa «Partida rápida» abajo para jugar al instante.' : error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

$('local-game-form').addEventListener('submit', (event) => {
  event.preventDefault();
  localPlayerName = $('localPlayerName').value.trim();
  if (!localPlayerName) {
    showMessage('local-game-message', 'Escribe tu nombre para empezar.', 'error');
    return;
  }

  if (localPlayerName.length > 120) {
    showMessage('local-game-message', 'El nombre supera la longitud permitida.', 'error');
    return;
  }

  if (window.location.protocol !== 'file:') {
    startHostedGame();
    return;
  }

  startLocalGame();
});

function startLocalGame() {
  try {
    localMode = true;
    localTeamName = 'Equipo local';
    currentUser = { full_name: localPlayerName, team_name: localTeamName, role: 'student' };
    $('student-name').textContent = localPlayerName;
    $('student-team').textContent = `Equipo: ${localTeamName} · Partida solo en este dispositivo`;
    showMessage('connection-message', '');
    showView('student-view');
    loadLocalGame();
    return true;
  } catch (error) {
    localMode = false;
    showView('auth-view');
    showMessage('local-game-message', error.message, 'error');
    return false;
  }
}

async function startHostedGame() {
  const button = $('local-game-form').querySelector('button[type="submit"]');
  button.disabled = true;
  showMessage('local-game-message', 'Iniciando partida...');
  try {
    await api('/api/auth/quick-start', {
      method: 'POST',
      body: JSON.stringify({ fullName: localPlayerName })
    });
    localMode = false;
    await loadCurrentUser();
  } catch (error) {
    if (error.apiUnavailable && startLocalGame()) {
      showMessage('connection-message', 'El servidor de cuentas no está disponible en este sitio. Estás jugando en este dispositivo; el progreso no se sincronizará.', 'success');
    } else {
      showMessage('local-game-message', error.message, 'error');
    }
  } finally {
    button.disabled = false;
  }
}

async function loadCurrentUser() {
  const result = await api('/api/game/me');
  currentUser = result.user;
  if (currentUser.role === 'admin') {
    showView('admin-view');
    await loadAdmin();
  } else {
    showView('student-view');
    $('student-name').textContent = currentUser.full_name;
    $('student-team').textContent = `Equipo: ${currentUser.team_name || 'Sin equipo'}`;
    await loadGame();
  }
}

async function logout() {
  if (localMode) {
    localMode = false;
    currentUser = null;
    showView('auth-view');
    return;
  }
  try {
    await api('/api/auth/logout', { method: 'POST', body: '{}' });
    currentUser = null;
    showMessage('connection-message', '');
    showView('auth-view');
  } catch (error) {
    showMessage('connection-message', error.message, 'error');
  }
}

$('logout-student').addEventListener('click', logout);
$('logout-admin').addEventListener('click', logout);

async function loadGame() {
  const data = await api('/api/game/missions');
  missions = data.missions;
  completed = data.completed;
  codeParts = data.codeParts;
  renderGameBoard();
  const firstPending = missions.findIndex(mission => !completed.includes(mission.number));
  if (data.escaped) {
    $('game-card').classList.add('hidden');
    $('game-complete').classList.remove('hidden');
    $('escape-code-stage').classList.add('hidden');
    $('escape-success').classList.remove('hidden');
    $('complete-icon').textContent = '✓';
    $('game-complete').classList.add('is-escaped');
    return;
  }
  $('student-team').textContent = `Equipo: ${data.teamName || 'Sin equipo'} · ${data.teamMembers || 1} de 5 integrantes`;
  if (firstPending === -1) {
    $('game-card').classList.add('hidden');
    $('game-complete').classList.remove('hidden');
    $('escape-code-stage').classList.remove('hidden');
    $('escape-success').classList.add('hidden');
    return;
  }
  $('game-card').classList.remove('hidden');
  $('game-complete').classList.add('hidden');
  currentIndex = firstPending;
  renderMission();
}

function loadLocalGame() {
  const saved = localStorage.getItem(getLocalProgressKey());
  const state = saved ? JSON.parse(saved) : { teamName: localTeamName, completed: [], escaped: false };
  if (!Array.isArray(state.completed) || typeof state.escaped !== 'boolean') {
    throw new Error('El progreso local está dañado. Borra los datos de este sitio e inténtalo de nuevo.');
  }
  localTeamName = state.teamName || localTeamName;
  localPlayerName = state.playerName || localPlayerName;
  currentUser.full_name = localPlayerName;
  currentUser.team_name = localTeamName;
  $('student-name').textContent = localPlayerName;
  $('student-team').textContent = `Equipo: ${localTeamName} · Partida solo en este dispositivo`;
  missions = localMissions.map(({ answer, ...mission }) => mission);
  completed = state.completed.filter(number => missions.some(mission => mission.number === number));
  codeParts = missions
    .filter(mission => completed.includes(mission.number))
    .map(mission => ({ missionNumber: mission.number, fragment: mission.codePart }));
  if (!saved) saveLocalProgress();
  renderGameBoard();
  $('game-card').classList.remove('hidden');
  $('game-complete').classList.add('hidden');

  if (state.escaped) {
    $('game-card').classList.add('hidden');
    $('game-complete').classList.remove('hidden');
    $('escape-code-stage').classList.add('hidden');
    $('escape-success').classList.remove('hidden');
    $('complete-icon').textContent = '✓';
    $('game-complete').classList.add('is-escaped');
    return;
  }

  $('game-complete').classList.remove('is-escaped');
  currentIndex = missions.findIndex(mission => !completed.includes(mission.number));
  if (currentIndex === -1) {
    $('game-card').classList.add('hidden');
    $('game-complete').classList.remove('hidden');
    $('escape-code-stage').classList.remove('hidden');
    $('escape-success').classList.add('hidden');
    return;
  }
  renderMission();
}

function saveLocalProgress(escaped = false) {
  localStorage.setItem(getLocalProgressKey(), JSON.stringify({
    playerName: localPlayerName,
    teamName: localTeamName,
    completed,
    escaped
  }));
}

function renderGameBoard() {
  const map = $('mission-map-items');
  map.replaceChildren();
  missions.forEach((mission, index) => {
    const isComplete = completed.includes(mission.number);
    const isActive = !isComplete && missions.findIndex(item => !completed.includes(item.number)) === index;
    const room = document.createElement('div');
    room.className = `map-room${isComplete ? ' is-complete' : ''}${isActive ? ' is-active' : ''}`;
    room.setAttribute('aria-label', `Misión ${mission.number}: ${isComplete ? 'completada' : isActive ? 'actual' : 'bloqueada'}`);
    const icon = document.createElement('span');
    icon.className = 'room-icon';
    icon.textContent = isComplete ? '✓' : isActive ? '⌖' : '🔒';
    const label = document.createElement('span');
    label.textContent = `PUERTA 0${mission.number}`;
    room.append(icon, label);
    map.append(room);
  });

  const parts = $('code-parts');
  parts.replaceChildren();
  missions.forEach(mission => {
    const part = codeParts.find(item => item.missionNumber === mission.number);
    const slot = document.createElement('span');
    slot.className = `code-part${part ? ' is-revealed' : ''}`;
    slot.setAttribute('aria-label', part ? `Fragmento ${part.fragment}` : 'Fragmento pendiente');
    slot.textContent = part ? part.fragment : '•';
    parts.append(slot);
  });
}

function renderMission() {
  const mission = missions[currentIndex];
  selectedOption = null;
  $('mission-category').textContent = `MISIÓN 0${mission.number} · ${mission.category}`;
  $('mission-title').textContent = mission.title;
  $('mission-counter').textContent = `${completed.length} de ${missions.length} completadas`;
  $('mission-story').textContent = mission.story;
  $('mission-question').textContent = mission.question;
  $('progress-bar').style.width = `${completed.length / missions.length * 100}%`;
  renderGameBoard();
  $('mission-feedback').textContent = '';
  $('hint-text').classList.add('hidden');
  $('hint-text').textContent = `Pista: ${mission.hint}`;
  resetMemoryChallenge();
  $('answer-button').disabled = false;
  $('answer-button').classList.remove('hidden');
  $('next-button').classList.add('hidden');

  const options = $('mission-options');
  options.replaceChildren();
  mission.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    const letter = document.createElement('span');
    letter.className = 'letter';
    letter.textContent = String.fromCharCode(65 + index);
    const text = document.createElement('span');
    text.textContent = option;
    button.append(letter, text);
    button.addEventListener('click', () => {
      selectedOption = index;
      options.querySelectorAll('.option').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
    options.append(button);
  });
}

function resetMemoryChallenge() {
  memoryGeneration++;
  const symbols = ['⌨', '⌨', '💾', '💾', '🔐', '🔐'];
  memoryCards = symbols.map((symbol, index) => ({ symbol, pairId: Math.floor(index / 2) }));
  for (let index = memoryCards.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [memoryCards[index], memoryCards[swapIndex]] = [memoryCards[swapIndex], memoryCards[index]];
  }
  flippedCards = [];
  matchedPairs = 0;
  memoryLocked = false;
  hintUnlocked = false;
  $('memory-progress').textContent = '0 de 3 parejas';
  $('memory-status').textContent = 'Encuentra las 3 parejas para ganar la pista.';
  $('memory-status').className = 'form-message';
  $('hint-button').disabled = true;
  $('hint-button').textContent = 'Juega para desbloquear la pista';
  $('hint-text').classList.add('hidden');

  const board = $('memory-cards');
  board.replaceChildren();
  memoryCards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-card';
    button.textContent = '?';
    button.setAttribute('aria-label', `Carta ${index + 1}, oculta`);
    button.addEventListener('click', () => flipMemoryCard(index));
    board.append(button);
  });
}

function flipMemoryCard(index) {
  if (memoryLocked || flippedCards.includes(index)) return;
  const cardElement = $('memory-cards').children[index];
  if (cardElement.classList.contains('is-matched')) return;

  cardElement.textContent = memoryCards[index].symbol;
  cardElement.setAttribute('aria-label', `Carta ${index + 1}: ${memoryCards[index].symbol}`);
  cardElement.classList.add('is-flipped');
  flippedCards.push(index);

  if (flippedCards.length < 2) return;

  const [first, second] = flippedCards;
  if (memoryCards[first].pairId === memoryCards[second].pairId) {
    [first, second].forEach(cardIndex => {
      const matchedCard = $('memory-cards').children[cardIndex];
      matchedCard.classList.add('is-matched');
      matchedCard.disabled = true;
    });
    flippedCards = [];
    matchedPairs++;
    $('memory-progress').textContent = `${matchedPairs} de 3 parejas`;
    if (matchedPairs === 3) {
      hintUnlocked = true;
      $('memory-status').textContent = '¡Reto superado! Ya puedes revelar la pista.';
      $('memory-status').className = 'form-message success';
      $('hint-button').disabled = false;
      $('hint-button').textContent = 'Revelar pista';
    }
    return;
  }

  memoryLocked = true;
  const generation = memoryGeneration;
  window.setTimeout(() => {
    if (generation !== memoryGeneration) return;
    [first, second].forEach(cardIndex => {
      const hiddenCard = $('memory-cards').children[cardIndex];
      hiddenCard.textContent = '?';
      hiddenCard.setAttribute('aria-label', `Carta ${cardIndex + 1}, oculta`);
      hiddenCard.classList.remove('is-flipped');
    });
    flippedCards = [];
    memoryLocked = false;
  }, 650);
}

$('hint-button').addEventListener('click', () => {
  if (!hintUnlocked) return;
  $('hint-text').classList.toggle('hidden');
  $('hint-button').textContent = $('hint-text').classList.contains('hidden') ? 'Mostrar pista' : 'Ocultar pista';
});

$('answer-button').addEventListener('click', async () => {
  if (selectedOption === null) {
    showMessage('mission-feedback', 'Selecciona una respuesta antes de continuar.', 'error');
    return;
  }
  const mission = missions[currentIndex];
  $('answer-button').disabled = true;
  try {
    const result = localMode
      ? (() => {
          const localMission = localMissions.find(item => item.number === mission.number);
          const correct = selectedOption === localMission.answer;
          return correct
            ? { correct, message: '¡Respuesta correcta! Misión completada.', explanation: localMission.explanation, codePart: { missionNumber: mission.number, fragment: localMission.codePart } }
            : { correct, message: 'Respuesta incorrecta. Conversen y vuelvan a intentarlo.' };
        })()
      : await api(`/api/game/missions/${mission.number}/answer`, {
          method: 'POST',
          body: JSON.stringify({ option: selectedOption })
        });
    if (!result.correct) {
      showMessage('mission-feedback', result.message, 'error');
      $('answer-button').disabled = false;
      return;
    }
    if (!completed.includes(mission.number)) completed.push(mission.number);
    codeParts.push(result.codePart);
    if (localMode) saveLocalProgress();
    renderGameBoard();
    showMessage('mission-feedback', `${result.message} Fragmento del código: ${result.codePart.fragment}. ${result.explanation}`, 'success');
    $('mission-options').querySelectorAll('button').forEach(button => button.disabled = true);
    $('answer-button').classList.add('hidden');
    $('next-button').classList.remove('hidden');
    $('mission-counter').textContent = `${completed.length} de ${missions.length} completadas`;
    $('progress-bar').style.width = `${completed.length / missions.length * 100}%`;
  } catch (error) {
    showMessage('mission-feedback', error.message, 'error');
    $('answer-button').disabled = false;
  }
});

$('next-button').addEventListener('click', () => {
  const nextIndex = missions.findIndex(mission => !completed.includes(mission.number));
  if (nextIndex === -1) {
    $('game-card').classList.add('hidden');
    $('game-complete').classList.remove('hidden');
    $('escape-code-stage').classList.remove('hidden');
    $('escape-success').classList.add('hidden');
    return;
  }
  currentIndex = nextIndex;
  $('answer-button').disabled = false;
  renderMission();
});

$('escape-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('escape-message', 'Comprobando código...');
  const button = $('escape-form').querySelector('button');
  button.disabled = true;
  try {
    const code = $('escape-code').value;
    if (localMode) {
      const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
      const secretCode = localMissions.map(mission => mission.codePart).join('');
      if (completed.length !== localMissions.length) {
        throw new Error('Completa las cinco misiones antes de probar el código.');
      }
      if (normalizedCode !== secretCode) {
        throw new Error('Ese código no abre la puerta. Revisa el orden de los fragmentos.');
      }
      saveLocalProgress(true);
    } else {
      await api('/api/game/escape', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
    }
    $('escape-code-stage').classList.add('hidden');
    $('escape-success').classList.remove('hidden');
    $('complete-icon').textContent = '✓';
    $('game-complete').classList.add('is-escaped');
  } catch (error) {
    showMessage('escape-message', error.message, 'error');
    button.disabled = false;
  }
});

async function loadAdmin() {
  const [summary, students, teams] = await Promise.all([
    api('/api/admin/summary'),
    api('/api/admin/students'),
    api('/api/admin/teams')
  ]);
  $('total-students').textContent = summary.students;
  $('total-teams').textContent = summary.teams;
  $('total-completions').textContent = summary.completedMissions;

  const studentBody = $('students-table');
  studentBody.replaceChildren();
  if (students.students.length === 0) {
    studentBody.innerHTML = '<tr><td colspan="4" class="empty-row">Todavía no hay estudiantes registrados.</td></tr>';
  } else {
    students.students.forEach(student => {
      const row = document.createElement('tr');
      [student.full_name, student.username, student.team_name || '—', `${student.completed_missions}/5`]
        .forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        });
      studentBody.append(row);
    });
  }

  const teamBody = $('teams-table');
  teamBody.replaceChildren();
  if (teams.teams.length === 0) {
    teamBody.innerHTML = '<tr><td colspan="3" class="empty-row">Todavía no hay equipos registrados.</td></tr>';
  } else {
    teams.teams.forEach(team => {
      const row = document.createElement('tr');
      [team.name, team.members, team.completed_missions].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      });
      teamBody.append(row);
    });
  }
}

$('refresh-admin').addEventListener('click', async () => {
  try { await loadAdmin(); }
  catch (error) { alert(error.message); }
});

async function initialize() {
  if (window.location.protocol === 'file:') {
    showView('auth-view');
    showMessage(
      'connection-message',
      'Escribe tu nombre en «Partida rápida» y pulsa «Empezar a jugar».',
      'success'
    );
    return;
  }

  try {
    await loadCurrentUser();
  } catch (error) {
    showView('auth-view');
    if (error.status !== 401) {
      showMessage(
        'connection-message',
        '¡Bienvenido! Escribe tu nombre en «Partida rápida» para comenzar tu misión de inmediato.',
        'success'
      );
    }
  }
}

initialize();
