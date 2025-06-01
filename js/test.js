// main.js
// El inicio de tu archivo y la función startJsPsychExperiment
// ... (código anterior de startJsPsychExperiment hasta la línea jsPsych.init)

function startJsPsychExperiment(participantData, showSection) {
  let jsPsych = initJsPsych({
    display_element: "jspsych-display", // Asegúrate de que este ID coincida con el de tu HTML
    on_finish: function () {
      showSection(document.getElementById("completion-message"));
      // Obtiene todos los datos registrados por jsPsych
      const allData = jsPsych.data.get();

      // Filtra solo los trials que son de tipo "response"
      const responseData = allData.filter({ task: "response" }).values();

      // Filtra los trials de respuesta específicos para la tarea "stroop"
      const stroopResponses = allData
        .filter({
          task: "response",
          test_part: "stroop",
          stroop_part: "stroop_prueba",
        })
        .values();
      const stroopResponsesAutomat = allData
        .filter({
          task: "response",
          test_part: "stroop",
          stroop_part: "stroop_automatizacion",
        })
        .values();

      // Filtra los trials de respuesta específicos para la tarea "simon"
      const simonResponses = allData
        .filter({
          task: "response",
          test_part: "simon",
        })
        .values();

      console.log("¡Experimento finalizado!");
      console.log("Todos los datos del experimento:", allData.values()); // Muestra todos los datos
      console.log("Datos de todos los trials de respuesta:", responseData);
      console.log(
        "Datos de los trials de respuesta del Automatizacion Stroop:",
        stroopResponsesAutomat
      );
      console.log(
        "Datos de los trials de respuesta del Stroop:",
        stroopResponses
      );
      console.log(
        "Datos de los trials de respuesta del Simon:",
        simonResponses
      );
    },
    on_trial_finish: function (data) {
      if (data.task === "response") {
        data.participantId = participantData.participantId;
        console.log("Trial terminado:", data);
        console.log("Se presionó la tecla con el código:", data.response);
      }
    },
  });
  // Define constants for messages and colors (optional, but good practice)
  const CORRECT_MESSAGE =
    "<p style='font-size: 80px; color: RGB(76, 175, 80); font-weight: bold;'>¡Correcto!</p>";
  const INCORRECT_MESSAGE =
    "<p style='font-size: 80px; color: RGB(204, 0, 0); font-weight: bold;'>Incorrecto</p>";
  const TIMEOUT_MESSAGE = "<p style='font-size: 80px; font-weight: bold;'>Se acabó el tiempo</p>";
  const GENERIC_PREP_MESSAGE =
    "<p style='font-size: 40px;'>Preparando siguiente prueba...</p>";
  const NO_DATA_MESSAGE =
    "<p style='font-size: 40px; color: gray;'>Esperando información...</p>";

  const gTimeResponse = 1400;
  const gVisibleStimul = 300;
  const gVisibleFixation = 500;
  const gTimeFeedbaak = 500;
  const gTimeFixation = function () {
    return jsPsych.randomization.sampleWithoutReplacement([600, 700], 1)[0];
  };

  // Se agregaron estilos inline para centrar y estilizar los elementos de respuesta
  const footer_simon = `
        <div class="response-instructions" style="position: absolute; bottom: 50px; width: 100%; text-align: center; display: flex; justify-content: center; align-items: center; gap: 80px;">
          <span class="response-option-left" style="font-size: 24px; color: #4169e1; font-weight: bold;">SHIFT izquierda (AZUL)</span>
          <span class="response-option-right" style="font-size: 24px; color: #DC143C; font-weight: bold;">SHIFT derecha (ROJO)</span>
        </div>
  `;

  // Se agregaron estilos inline para centrar y estilizar los elementos de respuesta
  const footer_stroop = `
        <div class="response-options-container" style="position: absolute; bottom: 50px; width: 100%; text-align: center; display: flex; justify-content: center; align-items: center; gap: 40px;">
              <span class="amarilloStroop response-option" style="font-size: 24px; color: #FFC300; font-weight: bold;">
                [1] AMARILLO
              </span>
              <span class="azulStroop response-option" style="font-size: 24px; color: #4169e1; font-weight: bold;">
                [2] AZUL
              </span>
              <span class="rojoStroop response-option" style="font-size: 24px; color: #DC143C; font-weight: bold;">
                [3] ROJO
              </span>
        </div>
  `;

  const feedback = {
    type: jsPsychHtmlKeyboardResponse,
    trial_duration: gTimeFeedbaak, // Short duration for quick feedback
    choices: "NO_KEYS", // No keys can be pressed to advance
    stimulus: function () {
      // **KEY CHANGE:** Get the 'test_part' directly from timeline variables
      // This ensures context from the *current* block/timeline
      const current_test_part = jsPsych.evaluateTimelineVariable("test_part");

      // Still get the last trial data to check correctness/response time
      const last_trial_data = jsPsych.data.get().last(1).values()[0];

      let mensaje = "";
      let footer_content = "";

      // First, validate if we have any data at all
      if (!last_trial_data || !last_trial_data.task) {
        console.warn(
          "No se encontraron datos del último trial o faltan propiedades esenciales."
        );
        return NO_DATA_MESSAGE; // Return early if no valid data
      }

      // Determine the feedback message based on the last response trial
      if (last_trial_data.task === "response") {
        if (last_trial_data.correct && last_trial_data.response !== null) {
          mensaje = CORRECT_MESSAGE;
        } else if (last_trial_data.response === null) {
          mensaje = TIMEOUT_MESSAGE;
        } else {
          mensaje = INCORRECT_MESSAGE;
        }
      } else {
        // If the previous trial was not a "response" trial (e.g., an instruction)
        mensaje = GENERIC_PREP_MESSAGE;
      }

      // Assign the footer content based on the *current block's context*
      if (current_test_part === "stroop") {
        footer_content = footer_stroop;
      } else if (current_test_part === "simon") {
        footer_content = footer_simon;
      }
      // If current_test_part is neither, footer_content will remain an empty string

      // Centraliza el mensaje de feedback
      return `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh;">
                ${mensaje}
                ${footer_content}
              </div>`;
    },
    data: {
      task: "feedback",
      // Store the test_part directly in the data for this feedback trial
      test_part: jsPsych.evaluateTimelineVariable("test_part"),
    },
  };

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      const current_test_part = jsPsych.evaluateTimelineVariable("test_part");
      let footer_content = "";

      if (current_test_part === "stroop") {
        footer_content = footer_stroop;
      } else if (current_test_part === "simon") {
        footer_content = footer_simon;
      }

      return `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; position: relative;">
                    <div id="fixation-plus" style="font-size: 80px; font-weight: bold; color: black; position: absolute;"><b>+</b></div>
                    ${footer_content}
                </div>
            `;
    },
    choices: "NO_KEYS",
    trial_duration: gTimeFixation,
    on_load: function () {
      setTimeout(() => {
        const el = document.getElementById("fixation-plus");
        if (el) el.style.display = "none";
      }, gVisibleFixation);
    },
    data: {
      task: "fixation",
      test_part: jsPsych.evaluateTimelineVariable("test_part"),
    },
  };

  const countdown_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "", // se actualizará dinámicamente
    choices: "NO_KEYS",
    on_start: function (trial) {
      trial.stimulus =
        "<div id='countdown' style='font-size: 70px; color: red; font-weight: bold;'>3</div>";
    },
    on_load: function () {
      let count = 3;
      const el = document.getElementById("countdown");
      const colores = {
        3: "RGB(204, 0, 0)", // Rojo fuerte (incorrecto)
        2: "RGB(255, 152, 0)", // Naranja tipo advertencia (puedes ajustar)
        1: "RGB(76, 175, 80)", // Verde (correcto)
      };

      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          el.innerHTML = count;
          el.style.color = colores[count];
        } else if (count === 0) {
          el.innerHTML = "¡Empezamos!";
          el.style.color = "#00b300"; // verde intenso
        } else {
          clearInterval(interval);
        }
      }, 1000); // Changed to 1000ms (1 second) for normal countdown
    },
    trial_duration: 3500, // Total duration for 3, 2, 1, ¡Empezamos!
    post_trial_gap: 500,
  };

  let timeline = [];

  const fullscreen_trial = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: '<p style="font-size: 20px; text-align: center;">El experimento pasará a pantalla completa. Por favor, asegúrate de no minimizar la ventana.</p><p style="font-size: 18px; text-align: center;">Presiona el botón "Continuar" para iniciar.</p>',
    button_label: "Continuar",
  };

  const fullscreen_trial_exit = {
    type: jsPsychFullscreen,
    fullscreen_mode: false,
    message: '<p style="font-size: 20px; text-align: center;">Has salido del modo de pantalla completa. Gracias por tu participación.</p>',
    button_label: "Finalizar",
  };

  const break_45_seconds_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <div style='text-align: center; font-size: 20px; line-height: 1.5; padding: 20px; max-width: 800px; margin: auto; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;'>
      <h2 style="color: #333; font-size: 32px; margin-bottom: 20px;">¡Tómate un breve descanso!</h2>
      <p style="margin-bottom: 15px;">Has completado una parte de la tarea. La siguiente parte será <strong>exactamente igual</strong>.</p>
      <p style="margin-bottom: 30px;">Tómate un momento para estirar las piernas o simplemente relajarte.</p>
      <p style='margin-top: 40px; font-size: 24px; color: #555;'>El experimento continuará automáticamente en <strong id="countdown-timer" style="color: #007bff;">30 segundos</strong>.</p>
    </div>
  `,
    choices: "NO_KEYS", // No keys can advance the trial
    trial_duration: 30000, // 30 seconds
    post_trial_gap: 500,
    on_load: function () {
      let timer = 30;
      const countdownElement = document.getElementById("countdown-timer");
      const interval = setInterval(() => {
        timer--;
        if (timer >= 0) {
          countdownElement.textContent = `${timer} segundos`;
        } else {
          clearInterval(interval);
        }
      }, 1000);
    },
  };

  const break_60_seconds_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <div style='text-align: center; font-size: 20px; line-height: 1.5; padding: 20px; max-width: 800px; margin: auto; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;'>
      <h2 style="color: #333; font-size: 32px; margin-bottom: 20px;">¡Descanso más largo!</h2>
      <p style="margin-bottom: 15px;">Has completado una de las tareas principales. ¡Buen trabajo!</p>
      <p style="margin-bottom: 15px;">Ahora te prepararás para una <strong>nueva tarea</strong>. Tómate un momento más largo para descansar, estirar las piernas o tomar un sorbo de agua.</p>
      <p style="margin-bottom: 30px;">Recuerda que en la siguiente tarea se te darán <strong>nuevas instrucciones</strong>.</p>
      <p style='margin-top: 40px; font-size: 24px; color: #555;'>El experimento continuará automáticamente en <strong id="countdown-timer" style="color: #007bff;">1 minuto</strong>.</p>
    </div>
  `,
    choices: "NO_KEYS", // No keys can advance the trial
    trial_duration: 60000, // 60 seconds (1 minute)
    post_trial_gap: 500,
    on_load: function () {
      let timer = 60;
      const countdownElement = document.getElementById("countdown-timer");
      const interval = setInterval(() => {
        timer--;
        if (timer > 0) {
          countdownElement.textContent = `${timer} segundos`;
        } else {
          countdownElement.textContent = "0 segundos"; // Ensures it shows 0 before moving
          clearInterval(interval);
        }
      }, 1000);
    },
  };

  const break_after_automation_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <div style='text-align: center; font-size: 20px; line-height: 1.5; padding: 20px; max-width: 800px; margin: auto; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;'>
      <h2 style="color: #333; font-size: 32px; margin-bottom: 20px;">¡Excelente trabajo en la fase de automatización!</h2>
      <p style="margin-bottom: 15px;">Sabemos que la fase anterior puede ser exigente y requiere mucha concentración.</p>
      <p style="margin-bottom: 15px;">Has hecho un gran esfuerzo. Ahora tómate este momento para <strong>descansar a fondo</strong>.</p>
      <p style="margin-bottom: 30px;">La siguiente parte del experimento es una <strong>nueva tarea</strong> con diferentes instrucciones. Utiliza este descanso para recargar energías.</p>
      <p style='margin-top: 40px; font-size: 24px; color: #555;'>El experimento continuará automáticamente en <strong id="countdown-timer" style="color: #007bff;">1 minuto</strong>.</p>
    </div>
  `,
    choices: "NO_KEYS", // No keys can advance the trial
    trial_duration: 60000, // 60 seconds (1 minute)
    post_trial_gap: 500,
    on_load: function () {
      let timer = 60;
      const countdownElement = document.getElementById("countdown-timer");
      const interval = setInterval(() => {
        timer--;
        if (timer > 0) {
          countdownElement.textContent = `${timer} segundos`;
        } else {
          countdownElement.textContent = "0 segundos";
          clearInterval(interval);
        }
      }, 1000);
    },
  };
  ///////////////////////////
  ///////SIMON///////////////
  ///////////////////////////

  // Variables SIMON
  let calc_important_variables = calcular_trialbase_Simon();
  let gVideoWidth = calc_important_variables.ancho;
  let trialbaseSimonPractica = calc_important_variables.trialbase;

  let reps = 5;
  const correct_responses_simon = {
    1: "ShiftLeft",
    2: "ShiftRight",
  };

  let trialBaseSimon = jsPsych.randomization.repeat(
    trialbaseSimonPractica, // Usar trialbaseSimonPractica para la base
    reps // Repetir 'reps' veces
  );
  console.log(trialbaseSimonPractica, trialBaseSimon);

  const instruccion_practica_simon = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: center; font-size: 20px; line-height: 1.6; max-width: 900px; margin: auto; padding: 20px;'>
      <p style="text-align: left; margin-bottom: 20px;">
      Estás a punto de participar en un estudio donde se te mostrará uno de dos estímulos:
      <strong>un círculo rojo o un círculo azul</strong>.<br><br>
      El círculo aparecerá en distintas posiciones (a la izquierda o a la derecha de la pantalla),
      pero <strong style="color: #DC143C;">su ubicación no es relevante</strong>.<br><br>
      Tu tarea es responder lo más rápido posible al <strong style="color: #007bff;">color del círculo</strong>:<br><br>
      &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Si ves un círculo <strong style="color: #4169e1;">azul</strong>, presiona la tecla <strong>SHIFT izquierda</strong>.<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Si ves un círculo <strong style="color: #DC143C;">rojo</strong>, presiona la tecla <strong>SHIFT derecha</strong>.
      </p>
      <p style="font-size: 22px; font-weight: bold; margin-top: 30px;">Coloca así tus manos:</p>
      <img src="img/SIMON_IMAGE.png" alt="Instrucción de mano" style="width: 400px; max-width: 80%; height: auto; margin-top: 20px; border: 1px solid #ccc; border-radius: 8px;">

      <p style="margin-top: 30px; margin-bottom: 20px;">Vas a comenzar con unos ensayos de práctica en los que se te dará una retroalimentación, para que te familiarices con la tarea.</p>

      <div style='display: flex; justify-content: center; gap: 80px; margin-top: 30px;'>
          <div style='text-align: center;'>
            <div class="circle azul" style="width: 80px; height: 80px; border-radius: 50%; background-color: #4169e1; margin: 0 auto 10px auto;"></div>
            <p style="font-weight: bold; color: #4169e1; font-size: 20px;">SHIFT izquierda</p>
          </div>
          <div>
            <div class="circle rojo" style="width: 80px; height: 80px; border-radius: 50%; background-color: #DC143C; margin: 0 auto 10px auto;"></div>
            <p style="font-weight: bold; color: #DC143C; font-size: 20px;">SHIFT derecha</p>
          </div>
      </div>

      <p style='margin-top: 40px; font-size: 22px; font-weight: bold; color: #007bff;'><strong>Presiona espacio para continuar</strong></p>
    </div>
    `,
    choices: ["Space"],
    post_trial_gap: 500,
  };

  const instruccion_real_simon = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: center; font-size: 22px; line-height: 1.6; max-width: 800px; margin: auto; padding: 20px;'>
      <p style="font-size: 28px; font-weight: bold; color: #333; margin-bottom: 25px;"><strong>Ahora comenzarás la tarea de verdad.</strong></p>
      <p style="margin-bottom: 15px;">Recuerda, no se te indicará si cometes un error, así que debes estar muy atento.</p>
      <p style="margin-bottom: 25px;">
      No olvides:<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Si ves un círculo <strong style="color: #4169e1;">azul</strong>, presiona la tecla <strong>SHIFT izquierda</strong>.<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Si ves un círculo <strong style="color: #DC143C;">rojo</strong>, presiona la tecla <strong>SHIFT derecha</strong>.
      </p>
      <div style='display: flex; justify-content: center; gap: 80px; margin-top: 30px;'>
          <div style='text-align: center;'>
            <div class="circle azul" style="width: 80px; height: 80px; border-radius: 50%; background-color: #4169e1; margin: 0 auto 10px auto;"></div>
            <p style="font-weight: bold; color: #4169e1; font-size: 20px;">SHIFT izquierda</p>
          </div>
          <div>
            <div class="circle rojo" style="width: 80px; height: 80px; border-radius: 50%; background-color: #DC143C; margin: 0 auto 10px auto;"></div>
            <p style="font-weight: bold; color: #DC143C; font-size: 20px;">SHIFT derecha</p>
          </div>
      </div>
      <p style='margin-top: 40px; font-size: 24px; font-weight: bold; color: #007bff;'><strong>Presiona espacio para comenzar</strong></p>
    </div>
    `,
    choices: ["Space"],
    post_trial_gap: 500,
  };

  const prueba_simons = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: function () {
      const color_code = jsPsych.evaluateTimelineVariable("stim");
      const xpos_actual = jsPsych.evaluateTimelineVariable("xpos");
      const color_class = color_code == 1 ? "azul" : "rojo"; // 1 for blue, 2 for red
      const actual_color = color_code == 1 ? "#4169e1" : "#DC143C"; // Hex colors

      return `
        <div class="stim-container" style="position: relative; height: 100vh; display: flex; justify-content: center; align-items: center;">
          <div id="circle-simon" class="circle ${color_class}"
                 style="position: absolute; left: calc(50% + ${xpos_actual}px); top: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; border-radius: 50%; background-color: ${actual_color};">
          </div>
          ${footer_simon}
        </div>
      `;
    },
    choices: ["ShiftLeft", "ShiftRight"],
    on_load: function () {
      setTimeout(() => {
        const el = document.getElementById("circle-simon");
        if (el) el.style.display = "none";
      }, gVisibleStimul);
    },
    data: {
      task: "response",
      // Calculamos toda la información de la condición aquí
      // `this` se refiere al objeto del trial en jsPsych data functions
      trial_info: function () {
        const stimCode = jsPsych.evaluateTimelineVariable("stim");
        const xPos = jsPsych.evaluateTimelineVariable("xpos");
        return getSimonTrialInfo(stimCode, xPos);
      },
    },
    trial_duration: gTimeResponse,
    on_finish: function (data) {
      data.test_part = jsPsych.evaluateTimelineVariable("test_part");
      // Las condiciones ya están en data.trial_info si seguiste la sugerencia anterior
      // Si no, puedes calcularlas aquí una vez:
      const stim_val = jsPsych.evaluateTimelineVariable("stim");
      const xpos_val = jsPsych.evaluateTimelineVariable("xpos");
      const trialInfo = getSimonTrialInfo(stim_val, xpos_val);

      // Asigna directamente las propiedades del objeto trialInfo a `data`
      data.stim_color = trialInfo.color;
      data.xpos_actual = xpos_val; // Mantener la variable original si es relevante
      data.posicion = trialInfo.position;
      data.congruencia = trialInfo.congruence;

      data.correct_response = trialInfo.correctResponse; // Obtenido de la función auxiliar
      data.correct = jsPsych.pluginAPI.compareKeys(
        data.response,
        data.correct_response
      );
    },
    save_trial_parameters: {
      stimulus: false,
    },
  };

  const test_procedure_practice_simon = {
    timeline: [fixation, prueba_simons, feedback],
    timeline_variables: trialbaseSimonPractica,
    randomize_order: true,
  };

  const test_procedure_simon = {
    timeline: [fixation, prueba_simons],
    timeline_variables: trialBaseSimon,
    randomize_order: true,
  };

  ///////////////////////////
  ///////STROOP//////////////
  ///////////////////////////

  //VARIABLES STROOP

  let bloque_automatizacion_stroop = 1;
  let bloque_stroop = 1;
  let automatizacionRespCorr = 0;
  const words = ["ROJO", "AZUL", "AMARILLO"];
  const colors = ["rojoStroop", "azulStroop", "amarilloStroop"]; // CSS classes
  const words_neutras = ["XXXXX", "XXXXX", "XXXXX"];
  const words_circulos = ["0", "0", "0"];

  let currentColor = "lightgray"; // Initial color for practice
  const correct_responses_stroop = {
    1: "Digit1",
    2: "Digit2",
    3: "Digit3",
  };
  // Define trial quantities in a clear configuration object
  const trialQuantities = {
    main: {
      circulos: 30,
      neutras: 20,
      congruentes: 20,
      incongruentes: 20,
    },
    practice: {
      neutras: 4,
      congruentes: 4,
      incongruentes: 4,
    },
  };

  function createStroopTrials(type, count, jsPsychInstance) {
    let wordSet;
    let isCongruent;

    switch (type) {
      case "circulos":
        wordSet = words_circulos;
        isCongruent = true; // Circles are always "congruent" with themselves (color matches stimType)
        break;
      case "neutras":
        wordSet = words_neutras;
        isCongruent = true; // Neutral words are always presented "congruently" with their color (word is neutral, color varies)
        break;
      case "congruentes":
        wordSet = words;
        isCongruent = true;
        break;
      case "incongruentes":
        wordSet = words;
        isCongruent = false;
        break;
      default:
        console.error("Unknown Stroop trial type:", type);
        return [];
    }
    return MezclarPalabrasStroop(
      wordSet,
      colors,
      isCongruent,
      count,
      jsPsychInstance
    );
  }

  // --- Generate Main Trials ---
  const trialCirculos = createStroopTrials(
    "circulos",
    trialQuantities.main.circulos,
    jsPsych
  );
  const trialNeutras = createStroopTrials(
    "neutras",
    trialQuantities.main.neutras,
    jsPsych
  );
  const trialCongruentes = createStroopTrials(
    "congruentes",
    trialQuantities.main.congruentes,
    jsPsych
  );
  const trialIncongruentes = createStroopTrials(
    "incongruentes",
    trialQuantities.main.incongruentes,
    jsPsych
  );

  // Combine main trials
  const trialBaseStroop = [
    ...trialCongruentes,
    ...trialNeutras,
    ...trialIncongruentes,
  ];

  // --- Generate Practice Trials ---
  const trialNeutrasPractica = createStroopTrials(
    "neutras",
    trialQuantities.practice.neutras,
    jsPsych
  );
  const trialCongruentesPractica = createStroopTrials(
    "congruentes",
    trialQuantities.practice.congruentes,
    jsPsych
  );
  const trialIncongruentesPractica = createStroopTrials(
    "incongruentes",
    trialQuantities.practice.incongruentes,
    jsPsych
  );

  // Combine practice trials
  const trialBaseStroopPractica = [
    ...trialCongruentesPractica,
    ...trialNeutrasPractica,
    ...trialIncongruentesPractica,
  ];

  // --- Logging for verification ---
  console.log("Trials Círculos:", trialCirculos);
  console.log("Trials Base (Main):", trialBaseStroop);
  console.log("Trials Base (Práctica):", trialBaseStroopPractica);

  const practica_color_dinamico_con_bucle = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code", // Asegura que la propiedad 'code' de la respuesta sea usada para la validación
    stimulus: function () {
      return `
      <div style="text-align: center; font-size: 20px; line-height: 1.5; max-width: 700px; margin: auto; padding: 20px; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <p style="font-weight: bold; font-size: 28px; margin-bottom: 20px;"><strong>Esta es una fase de práctica importante.</strong></p>
      <p style="margin-bottom: 20px;">Verás círculos de colores y debes presionar la tecla según el color:</p>
        <p style="font-size: 24px; font-weight: bold; margin-bottom: 30px;">
            <span style="color: #FFC300;">1 → AMARILLO</span> |
            <span style="color: #4169e1;">2 → AZUL</span> |
            <span style="color: #DC143C;">3 → ROJO</span>
        </p>

        <div id="colorBox" style="width: 150px; height: 150px; margin: 30px auto; background-color: ${currentColor}; border: 3px solid #000; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 40px; color: white;"></div>

        <p style="margin-top: 30px; margin-bottom: 15px;">Practica libremente con las teclas para verificar los colores.</p>
        <p>Luego harás bloques donde deberás mantener buena precisión y velocidad, si te sientes ya listo.</p>
        <p style="margin-top: 40px; font-size: 22px; font-weight: bold; color: #007bff;"><strong>Presiona espacio para comenzar.</strong></p>
      </div>
    `;
    },
    choices: ["Digit1", "Digit2", "Digit3", "Space"],
    on_finish: function (data) {
      const key = data.response;
      if (key === "Digit1") {
        currentColor = "rgb(255,195,0)"; // Amarillo
      } else if (key === "Digit2") {
        currentColor = "rgb(41,70,255)"; // Azul
      } else if (key === "Digit3") {
        currentColor = "rgb(180,0,50)"; // Rojo
      }
      data.practice_key_pressed = key;
    },
  };

  const loop_practica_colores = {
    timeline: [practica_color_dinamico_con_bucle],
    loop_function: function (data) {
      const lastResponse = data.values()[0].practice_key_pressed;
      if (lastResponse === "Space") {
        return false;
      } else {
        return true;
      }
    },
  };

  const automatizacion_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: function () {
      const color_class = jsPsych.evaluateTimelineVariable("color"); // e.g., "rojoStroop"
      // Map class name to actual hex color for inline style
      let actual_color = '';
      if (color_class === 'rojoStroop') actual_color = '#DC143C'; // Crimson
      else if (color_class === 'azulStroop') actual_color = '#4169e1'; // Royal Blue
      else if (color_class === 'amarilloStroop') actual_color = '#FFC300'; // Amber

      return `
        <div class="stim-container" style="position: relative; height: 100vh; display: flex; justify-content: center; align-items: center;">
          <div id="circle-stroop" class="circle ${color_class}"
               style="position: absolute; width: 150px; height: 150px; border-radius: 50%; background-color: ${actual_color};">
          </div>
          ${footer_stroop}
        </div>
      `;
    },
    choices: ["Digit1", "Digit2", "Digit3"],
    on_load: function () {
      setTimeout(() => {
        const el = document.getElementById("circle-stroop");
        if (el) el.style.display = "none";
      }, gVisibleStimul);
    },
    data: {
      stroop_part: "stroop_automatizacion",
      task: "response",
      stimColor: function () {
        return getColorInfo(jsPsych.evaluateTimelineVariable("color")).name;
      },
      stimWord: function () {
        const word_val = jsPsych.evaluateTimelineVariable("word");
        return word_val === "0" ? "Circulo" : word_val;
      },
    },
    trial_duration: gTimeResponse,
    save_trial_parameters: {
      stimulus: false,
    },
    on_finish: function (data) {
      data.test_part = jsPsych.evaluateTimelineVariable("test_part");
      data.bloque_automatizacion_stroop = bloque_automatizacion_stroop;

      // Determinar la respuesta del color
      const responseKeyInfo = {
        Digit3: getColorInfo("rojoStroop"),
        Digit2: getColorInfo("azulStroop"),
        Digit1: getColorInfo("amarilloStroop"),
      };
      data.colorResponse =
        responseKeyInfo[data.response]?.name || "DESCONOCIDO";

      // Determinar la respuesta correcta
      const stimColorInfo = getColorInfo(
        jsPsych.evaluateTimelineVariable("color")
      );
      data.correct_response = stimColorInfo.key; // Esto asume que correct_responses_stroop mapea color_class a la tecla correcta

      // Comprobar si la respuesta es correcta
      data.correct = jsPsych.pluginAPI.compareKeys(
        data.response,
        data.correct_response
      );
    },
  };

  const test_automatizacion_stroop = {
    timeline: [fixation, automatizacion_stroop, feedback],
    timeline_variables: trialCirculos,
    randomize_order: true,
  };

  const prueba_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: function () {
      const color_class = jsPsych.evaluateTimelineVariable("color");
      const word = jsPsych.evaluateTimelineVariable("word");
      // Map class name to actual hex color for inline style
      let actual_color = '';
      if (color_class === 'rojoStroop') actual_color = '#DC143C'; // Crimson
      else if (color_class === 'azulStroop') actual_color = '#4169e1'; // Royal Blue
      else if (color_class === 'amarilloStroop') actual_color = '#FFC300'; // Amber

      return `
        <div class="stim-container" style="position: relative; height: 100vh; display: flex; justify-content: center; align-items: center;">
          <p id="word-stroop" class="${color_class}"
             style="font-size: 80px; font-weight: bold; position: absolute; color: ${actual_color}; margin: 0; padding: 0;">${word}</p>
          ${footer_stroop}
        </div>
      `;
    },
    choices: ["Digit1", "Digit2", "Digit3", "Space"],
    on_load: function () {
      setTimeout(() => {
        const el = document.getElementById("word-stroop");
        if (el) el.style.display = "none";
      }, gVisibleStimul);
    },
    data: {
      stroop_part: "stroop_prueba",
      task: "response",
      stimColor: function () {
        return getColorInfo(jsPsych.evaluateTimelineVariable("color")).name;
      },
      stimWord: function () {
        const word_val = jsPsych.evaluateTimelineVariable("word");
        return word_val === "0" ? "Circulo" : word_val;
      },
    },
    trial_duration: gTimeResponse,
    save_trial_parameters: {
      stimulus: false,
    },
    on_finish: function (data) {
      data.test_part = jsPsych.evaluateTimelineVariable("test_part");
      data.bloque_automatizacion_stroop = bloque_automatizacion_stroop;

      // Determinar la respuesta del color
      const responseKeyInfo = {
        Digit3: getColorInfo("rojoStroop"),
        Digit2: getColorInfo("azulStroop"),
        Digit1: getColorInfo("amarilloStroop"),
      };
      data.colorResponse =
        responseKeyInfo[data.response]?.name || "DESCONOCIDO";

      // Determinar la respuesta correcta
      const stimColorInfo = getColorInfo(
        jsPsych.evaluateTimelineVariable("color")
      );
      data.correct_response = stimColorInfo.key; // Esto asume que correct_responses_stroop mapea color_class a la tecla correcta

      // Comprobar si la respuesta es correcta
      data.correct = jsPsych.pluginAPI.compareKeys(
        data.response,
        data.correct_response
      );
    },
  };

  const loop_automatizacion = {
    timeline: [test_automatizacion_stroop],
    loop_function: function (data) {
      if (bloque_automatizacion_stroop === 5) {
        return false;
      }
      bloque_automatizacion_stroop = (bloque_automatizacion_stroop || 0) + 1;
      const all_trials = data
        .values()
        .filter((trial) => trial.task === "response");

      const correct_trials = all_trials.filter(
        (trial) => trial.correct === true
      );
      const rt_sum = correct_trials.reduce((sum, trial) => sum + trial.rt, 0);
      const rt_avg =
        correct_trials.length > 0 ? rt_sum / correct_trials.length : 0;

      if (correct_trials.length >= 27 && rt_avg < 550) {
        automatizacionRespCorr++; // Incrementar el contador de bloques consecutivos exitosos
      } else {
        automatizacionRespCorr = 0; // Resetear el contador si no se cumplen las condiciones
      }

      console.log(
        "Bloque [",
        bloque_automatizacion_stroop - 1,
        "] Correctas:",
        correct_trials.length,
        "RT promedio:",
        rt_avg
      );
      console.log("Bloques consecutivos exitosos:", automatizacionRespCorr);

      // Terminar el bucle si se han completado 2 bloques consecutivos exitosos
      return !(automatizacionRespCorr >= 2);
    },
  };

  const test_procedure_stroop = {
    timeline: [fixation, prueba_stroop],
    timeline_variables: trialBaseStroop,
    randomize_order: true,
  };

  const test_procedure_practice_stroop = {
    timeline: [fixation, prueba_stroop, feedback],
    timeline_variables: trialBaseStroopPractica,
    randomize_order: true,
  };
  const instruccion_practica_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
<div style="font-size: 20px; line-height: 1.6; text-align: center; max-width: 900px; margin: auto; padding: 20px;">
    <p style="text-align: left; margin-bottom: 20px;">
        Ahora en lugar de círculos verás palabras de colores a las que también deberás responder con las teclas.<br><br>
        <strong style="color: #DC143C;">¡MUY IMPORTANTE!</strong> No debes leer la palabra. Debes fijarte únicamente en el color con el que está pintada. Enfócate solo en el color de la tinta.<br><br>
        Por ejemplo, puede que leas la palabra '<em>azul</em>', pero esté pintada de color <strong style="color: #DC143C;">rojo</strong>.<br><br>
        Debes presionar la tecla correspondiente al color de la tinta.<br><br>
    </p>
    <p style="font-weight: bold; font-size: 24px; margin-bottom: 30px;">
        <u>Recuerda:</u><br><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #FFC300;">Amarillo → Tecla 1</span><br><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #4169e1;">Azul → Tecla 2</span><br><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #DC143C;">Rojo → Tecla 3</span><br><br>
    </p>
    <p style="margin-top: 30px; margin-bottom: 20px;">Vas a comenzar con unos pocos ensayos de práctica para que te familiarices con la tarea.</p>
    <p style="font-size: 22px; font-weight: bold; color: #007bff;"><strong>Presiona espacio para continuar</strong></p>
</div>
    `,
    choices: ["Space"],
    post_trial_gap: 500,
  };
  const instruccion_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style="font-size: 20px; line-height: 1.6; text-align: center; max-width: 800px; margin: auto; padding: 20px;">
        <p style="font-size: 28px; font-weight: bold; color: #333; margin-bottom: 25px;">
            <strong>Ahora comenzarás la tarea de verdad.</strong>
        </p>
        <p style="margin-bottom: 15px;">
            Recuerda, no se te indicará si cometes un error, así que debes estar muy atento.<br><br>
            Debes fijarte únicamente en el color con el que está pintada la palabra. Enfócate solo en el color de la tinta.
        </p>
        <p style="font-size: 24px; font-weight: bold; margin-top: 30px; color: #007bff;">
            <strong>¡TÚ PUEDES!</strong> Mantente concentrado durante toda la tarea.
        </p>
        <p style='margin-top: 40px; font-size: 22px; font-weight: bold; color: #007bff;'>
            <strong>Presiona espacio para continuar</strong>
        </p>
    </div>
    `,
    choices: ["Space"],
    post_trial_gap: 500,
  };
  timeline.push(
    fullscreen_trial, // Inicio del modo de pantalla completa
    instruccion_practica_simon,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [test_procedure_practice_simon],
      data: { test_part: "simon" }
    },
    instruccion_real_simon,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [test_procedure_simon],
      data: { test_part: "simon" }
    },
    break_45_seconds_trial,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [test_procedure_simon],
      data: { test_part: "simon" }
    },
    break_60_seconds_trial,
    loop_practica_colores,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [loop_automatizacion],
      data: { test_part: "stroop" } // test_part para automatización
    },
    break_after_automation_trial,
    instruccion_practica_stroop,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [test_procedure_practice_stroop],
      data: { test_part: "stroop" }
    },
    instruccion_stroop,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [test_procedure_stroop],
      data: { test_part: "stroop" }
    },
    break_45_seconds_trial,
    countdown_trial,
    { // Envolver el bloque en un objeto de timeline para establecer test_part
      timeline: [test_procedure_stroop],
      data: { test_part: "stroop" }
    },
    break_60_seconds_trial,
    fullscreen_trial_exit, // Salida del modo de pantalla completa
  );

  jsPsych.run(timeline);
}
