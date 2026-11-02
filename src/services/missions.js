// Contenido del juego. No contiene usuarios, equipos ni resultados de ejemplo.
const missions = [
  {
    number: 1,
    title: 'La secuencia misteriosa',
    category: 'Pensamiento lógico',
    story: 'La primera puerta tiene una secuencia incompleta. Descubre el patrón.',
    question: '¿Qué número continúa esta secuencia? 2, 4, 8, 16, ___',
    options: ['18', '24', '32', '30'],
    answer: 2,
    codePart: 'N',
    hint: 'Cada número se multiplica por 2.',
    explanation: 'Cada número es el doble del anterior.'
  },
  {
    number: 2,
    title: 'El robot perdido',
    category: 'Algoritmos',
    story: 'Un robot necesita llegar a la salida. Solo entiende instrucciones ordenadas.',
    question: '¿Cuál es el orden lógico para comenzar a trabajar en una computadora?',
    options: [
      'Abrir programa → Encender → Conectar energía',
      'Conectar energía → Encender → Abrir programa',
      'Encender → Desconectar → Abrir programa',
      'Abrir programa → Desconectar energía → Encender'
    ],
    answer: 1,
    codePart: 'O',
    hint: 'Primero necesita energía, después encenderse y finalmente abrir el programa.',
    explanation: 'Una secuencia de instrucciones debe respetar el orden de ejecución.'
  },
  {
    number: 3,
    title: 'El mensaje oculto',
    category: 'JavaScript',
    story: 'El sistema dejó un mensaje en una variable. Calcula el resultado.',
    question: 'let edad = 20;\nconsole.log(edad + 5);\n¿Qué resultado mostrará?',
    options: ['20', '25', '205', 'Error'],
    answer: 1,
    codePart: 'D',
    hint: 'El operador + suma números cuando ambos valores son numéricos.',
    explanation: 'La suma de 20 + 5 es 25.'
  },
  {
    number: 4,
    title: 'El error del sistema',
    category: 'Depuración',
    story: 'Una condición debe comprobar si una persona tiene 18 años o más.',
    question: '¿Cuál condición es correcta en JavaScript?',
    options: ['if (edad = 18)', 'if (edad => 18)', 'if (edad >= 18)', 'if (edad < 18)'],
    answer: 2,
    codePart: 'E',
    hint: 'El operador de mayor o igual es >=.',
    explanation: 'El operador >= compara si un valor es mayor o igual a otro.'
  },
  {
    number: 5,
    title: 'La última llave',
    category: 'Bases de datos',
    story: 'La puerta final necesita consultar todos los registros de una tabla estudiantes.',
    question: '¿Qué consulta SQL es correcta?',
    options: [
      'GET ALL estudiantes;',
      'SELECT * FROM estudiantes;',
      'OPEN estudiantes;',
      'SHOW estudiantes ALL;'
    ],
    answer: 1,
    codePart: '5',
    hint: 'SELECT consulta datos y el asterisco representa todas las columnas.',
    explanation: 'SELECT * FROM estudiantes consulta todas las columnas de la tabla.'
  }
];

function publicMission(mission) {
  const { answer, codePart, ...safeMission } = mission;
  return safeMission;
}

module.exports = { missions, publicMission };
