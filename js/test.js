// jspsych-experiment.js

// Asegúrate de que `initJsPsych` esté disponible (ej. globalmente o importado).
// Asumo que 'timeline' es la variable donde tienes tus trials definidos en algún lugar.

function startJsPsychExperiment(participantInfo, showSectionCallback, saveToFirebaseRobustly, initialProgressStage) {
  console.log("Iniciando experimento jsPsych con información del participante:", participantInfo.participantId);
  console.log("Etapa inicial detectada:", initialProgressStage);

  let jsPsych = initJsPsych({
    display_element: "jspsych-display",
    on_finish: async function () {
      // Esta función on_finish se llama al final de la *timeline principal*.
      // Si el usuario llega aquí, significa que todo el experimento ha terminado.
      showSectionCallback(document.getElementById("completion-message"));

      // Obtener todos los datos finales, ya que los datos de cada sección
      // se guardaron en sus respectivas llamadas a `on_finish` de la timeline.
      const allFinalData = jsPsych.data.get();

      // Guardar el estado final de completado en Firebase
      try {
          await saveToFirebaseRobustly(
              `participants/${participantInfo.participantId}/experiment_results/completion_timestamp`,
              new Date().toISOString()
          );
          await saveToFirebaseRobustly(
              `participants/${participantInfo.participantId}/current_stage`,
              'experiment_completed'
          );
          console.log("Estado de finalización del experimento guardado.");
          localStorage.removeItem('experiment_session_id'); // Limpiar ID de sesión al finalizar con éxito
      } catch (error) {
          console.error("Error al guardar el estado de finalización del experimento:", error);
      }

      console.log("¡Experimento finalizado completamente!");
      // Aquí podrías mostrar un mensaje de agradecimiento final o redirigir.
    },
    // No necesitamos on_trial_finish para guardar parciales si guardamos por sección.
    // Pero puedes usarlo para añadir participantId y groupId a cada trial.
    on_trial_finish: function (data) {
        if (data.task === "Response") {
            data.participantId = participantInfo.participantId;
            data.groupId = participantInfo.groupId;
            // data.trial_timestamp = new Date().toISOString(); // Opcional
        }
    }
  });

  // --- Definición de las Timelines de Cada Sección (Asumo que tus trials están definidos antes) ---

  // Ejemplo: timeline de la tarea Simon
  const simon_timeline = [
      // ... tus trials de Simon (práctica y prueba) aquí ...
      // Asegúrate de que tus trials tengan properties como `task: "Response"`, `test_part: "Simon"`, `fase: "Practica"` o `fase: "Prueba"`
      // Por ejemplo:
      {
        type: jsPsychImageKeyboardResponse, // O el tipo de plugin que uses
        stimulus: 'img/simon_stim.png',
        choices: ['j', 'k'],
        data: { test_part: 'Simon', task: 'Response', fase: 'Practica' },
        // ... otras propiedades de trial ...
      },
      // ... más trials de Simon ...
  ];

  // Ejemplo: timeline de la tarea Stroop
  const stroop_timeline = [
      // ... tus trials de Stroop (automatización, práctica, prueba) aquí ...
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<p style="color:red;">AZUL</p>',
        choices: ['j', 'k'],
        data: { test_part: 'Stroop', task: 'Response', fase: 'Automatizacion' },
      },
      // ... más trials de Stroop ...
  ];

  // Ejemplo: timeline de la tarea Go/NoGo
  const gonogo_timeline = [
      // ... tus trials de Go/NoGo (práctica y prueba) aquí ...
      {
        type: jsPsychImageKeyboardResponse,
        stimulus: 'img/go_stim.png',
        choices: ['space'],
        data: { test_part: 'Go/NoGo', task: 'Response', fase: 'Prueba' },
      },
      // ... más trials de Go/NoGo ...
  ];

  // --- Wrapper para las Timelines de cada sección con guardado intermedio ---
  const simon_block = {
    timeline: simon_timeline,
    on_finish: async function() {
        const simonData = jsPsych.data.get().filter({test_part: 'Simon', task: 'Response'}).values();
        const simonPractica = simonData.filter(d => d.fase === 'Practica');
        const simonPrueba = simonData.filter(d => d.fase === 'Prueba');

        const dataToSave = {
            practica: simonPractica,
            prueba: simonPrueba,
            timestamp_completed: new Date().toISOString()
        };

        try {
            await saveToFirebaseRobustly(`participants/${participantInfo.participantId}/experiment_results/simon_results`, dataToSave);
            await saveToFirebaseRobustly(`participants/${participantInfo.participantId}/current_stage`, 'simon_completed');
            console.log("Datos de Simon guardados y stage actualizado.");
        } catch (error) {
            console.error("Error al guardar datos de Simon:", error);
            // Manejo de errores: Puedes forzar la detención, pedir que reintente, etc.
        }
    }
  };

  const stroop_block = {
    timeline: stroop_timeline,
    on_finish: async function() {
        const stroopData = jsPsych.data.get().filter({test_part: 'Stroop', task: 'Response'}).values();
        const stroopAutomatizacion = stroopData.filter(d => d.fase === 'Automatizacion');
        const stroopPractica = stroopData.filter(d => d.fase === 'Practica');
        const stroopPrueba = stroopData.filter(d => d.fase === 'Prueba');

        const dataToSave = {
            automatizacion: stroopAutomatizacion,
            practica: stroopPractica,
            prueba: stroopPrueba,
            timestamp_completed: new Date().toISOString()
        };

        try {
            await saveToFirebaseRobustly(`participants/${participantInfo.participantId}/experiment_results/stroop_results`, dataToSave);
            await saveToFirebaseRobustly(`participants/${participantInfo.participantId}/current_stage`, 'stroop_completed');
            console.log("Datos de Stroop guardados y stage actualizado.");
        } catch (error) {
            console.error("Error al guardar datos de Stroop:", error);
        }
    }
  };

  const gonogo_block = {
    timeline: gonogo_timeline,
    on_finish: async function() {
        const gonogoData = jsPsych.data.get().filter({test_part: 'Go/NoGo', task: 'Response'}).values();
        const gonogoPractica = gonogoData.filter(d => d.fase === 'Practica');
        const gonogoPrueba = gonogoData.filter(d => d.fase === 'Prueba');

        const dataToSave = {
            practica: gonogoPractica,
            prueba: gonogoPrueba,
            timestamp_completed: new Date().toISOString()
        };

        try {
            await saveToFirebaseRobustly(`participants/${participantInfo.participantId}/experiment_results/gonogo_results`, dataToSave);
            await saveToFirebaseRobustly(`participants/${participantInfo.participantId}/current_stage`, 'gonogo_completed');
            console.log("Datos de Go/NoGo guardados y stage actualizado.");
        } catch (error) {
            console.error("Error al guardar datos de Go/NoGo:", error);
        }
    }
  };

  // --- Construcción Dinámica de la Timeline Principal ---
  let main_experiment_timeline = [];

  // Secciones introductorias o bloques que no necesitan reanudación precisa
  // Por ejemplo, instrucciones que siempre se muestran si el experimento no ha terminado
  const intro_block = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<h1>Bienvenido al Experimento</h1><p>Presiona espacio para continuar.</p>',
      choices: [' '],
      // Puedes añadir una condición aquí para solo mostrar si `initialProgressStage` es 'demographics_completed'
  };
  // main_experiment_timeline.push(intro_block); // Descomenta si necesitas un bloque de introducción siempre

  // Decide desde qué punto comenzar el experimento
  // Esto asume que el orden es Simon -> Stroop -> Go/NoGo
  if (initialProgressStage === 'demographics_completed' || initialProgressStage === 'start') { // Si demográficos acabados o es un inicio fresco
      main_experiment_timeline.push(simon_block);
      main_experiment_timeline.push(stroop_block);
      main_experiment_timeline.push(gonogo_block);
  } else if (initialProgressStage === 'simon_completed') {
      main_experiment_timeline.push(stroop_block);
      main_experiment_timeline.push(gonogo_block);
  } else if (initialProgressStage === 'stroop_completed') {
      main_experiment_timeline.push(gonogo_block);
  }
  // Si initialProgressStage es 'gonogo_completed' o 'experiment_completed', main_experiment_timeline estará vacío,
  // y el `on_finish` de jsPsych.run se activará inmediatamente (si hay 0 trials), o no se correrá si ya se completó.

  // Inicia el experimento jsPsych con la timeline dinámica
  jsPsych.run(main_experiment_timeline);
}