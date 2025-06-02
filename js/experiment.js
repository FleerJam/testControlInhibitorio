function startJsPsychExperiment(
  participantInfo,
  saveToFirebaseRobustly,
  saveToFirebaseRobustly,
  initialProgressStage,
  showSection
) {
  console.log(
    "Iniciando experimento jsPsych con información del participante:",
    participantInfo.participantId,
    "grupo",
    participantInfo.groupId
  );
  document.getElementById("container").style.display = "none";

  console.log("Etapa inicial detectada:", initialProgressStage);
  let jsPsych = initJsPsych({
    display_element: "jspsych-display",
    on_finish: async function (data) {
      showSection(document.getElementById("completion-message"));

      // Guardar el estado final de completado en Firebase
      try {
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/experiment_results/completion_timestamp`,
          new Date().toISOString()
        );
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/current_stage`,
          "experiment_completed"
        );
        console.log("Estado de finalización del experimento guardado.");
        localStorage.removeItem("experiment_session_id"); // Limpiar ID de sesión al finalizar con éxito
      } catch (error) {
        console.error(
          "Error al guardar el estado de finalización del experimento:",
          error
        );
      }

      console.log("¡Experimento finalizado completamente!");
      // Aquí podrías mostrar un mensaje de agradecimiento final o redirigir.
    },
    on_trial_finish: function (data) {
      if (data.task === "Response") {
        data.participantId = participantInfo.participantId;
        data.groupId = participantInfo.groupId;
      }
    },
  });
  // Define constants for messages and colors (optional, but good practice)
  const CORRECT_MESSAGE =
    "<p style='font-size: 80px; color: RGB(76, 175, 80);'>¡Correcto!</p>";
  const INCORRECT_MESSAGE =
    "<p style='font-size: 80px; color: RGB(204, 0, 0);'>Incorrecto</p>";
  const TIMEOUT_MESSAGE = "<p style='font-size: 80px;'>Se acabó el tiempo</p>";
  const GENERIC_PREP_MESSAGE =
    "<p style='font-size: 40px;'>Preparando siguiente prueba...</p>";
  const NO_DATA_MESSAGE =
    "<p style='font-size: 40px; color: gray;'>Esperando información...</p>";

  const gTimeResponse = 1400;
  const gVisibleStimul = 600;
  const gVisibleFixation = 400;
  const gTimeFeedbaak = 500;
  const gTimeFixation = function () {
    return jsPsych.randomization.sampleWithoutReplacement([600, 700], 1)[0];
  };

  /*const gTimeResponse = 0;
  const gVisibleStimul = 0;
  const gVisibleFixation = 0;
  const gTimeFeedbaak = 0;
  const gTimeFixation = function () {
    return jsPsych.randomization.sampleWithoutReplacement([0, 0], 1)[0];
  };*/

  const footer_simon = `
        <div class="response-instructions">
          <span class="response-option-left">SHIFT Izquierda Azul</span>
          <span class="response-option-right">SHIFT Derecha Rojo</span>
        </div>
  `;
  const footer_gonogo = `
        <div class="response-instruction-gonogo">
          <span class="response-option">Presiona la barra espaciadora cuando aparezca una P</span>
        </div>
  `;

  const footer_stroop = `
        <div class="response-options-container">
              <span class="amarilloStroop response-option">
                [1] AMARILLO
              </span>
              <span class="azulStroop response-option">
                [2] AZUL
              </span>
              <span class="rojoStroop response-option">
                [3] ROJO
              </span>
        </div>
  `;

  const feedback = {
    type: jsPsychHtmlKeyboardResponse,
    trial_duration: gTimeFeedbaak, // Short duration for quick feedback
    choices: "NO_KEYS", // No keys can be pressed to advance
    stimulus: function () {
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
      if (last_trial_data.task === "Response") {
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
      if (current_test_part === "Stroop") {
        footer_content = footer_stroop;
      } else if (current_test_part === "Simon") {
        footer_content = footer_simon;
      }
      // If current_test_part is neither, footer_content will remain an empty string

      return mensaje + footer_content;
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

      if (current_test_part === "Stroop") {
        footer_content = footer_stroop;
      } else if (current_test_part === "Simon") {
        footer_content = footer_simon;
      }

      return `
            <div id="fixation-plus" style="font-size: 80px;"><b>+</b></div>
            ${footer_content}
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
        "<div id='countdown' style='font-size: 70px; color: red;'>3</div>";
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
      }, 750);
    },
    trial_duration: 3000,
    post_trial_gap: 500,
  };

  let timeline = [];

  const fullscreen_trial = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
  };

  const fullscreen_trial_exit = {
    type: jsPsychFullscreen,
    fullscreen_mode: false,
  };

  const break_45_seconds_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
    <div style='text-align: center; font-size: 20px;'>
      <h2>¡Tómate un breve descanso!</h2>
      <p>Has completado una parte de la tarea. La siguiente parte será <strong>exactamente igual</strong>.</p>
      <p>Tómate un momento para estirar las piernas o simplemente relajarte.</p>
      <p style='margin-top: 40px;'>El experimento continuará automáticamente en <strong id="countdown-timer">30 segundos</strong>.</p>
    </div>
  `,
    choices: "NO_KEYS", // No keys can advance the trial
    trial_duration: 30000, // 45 seconds
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
    <div style='text-align: center; font-size: 20px;'>
      <h2>¡Descanso más largo!</h2>
      <p>Has completado una de las tareas principales. ¡Buen trabajo!</p>
      <p>Ahora te prepararás para una <strong>nueva tarea</strong>. Tómate un momento más largo para descansar, estirar las piernas o tomar un sorbo de agua.</p>
      <p>Recuerda que en la siguiente tarea se te darán <strong>nuevas instrucciones</strong>.</p>
      <p style='margin-top: 40px;'>El experimento continuará automáticamente en <strong id="countdown-timer">1 minuto</strong>.</p>
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
    <div style='text-align: center; font-size: 20px;'>
      <h2>¡Excelente trabajo en la fase de automatización!</h2>
      <p>Sabemos que la fase anterior puede ser exigente y requiere mucha concentración.</p>
      <p>Has hecho un gran esfuerzo. Ahora tómate este momento para <strong>descansar a fondo</strong>.</p>
      <p>La siguiente parte del experimento es una <strong>nueva tarea</strong> con diferentes instrucciones. Utiliza este descanso para recargar energías.</p>
      <p style='margin-top: 40px;'>El experimento continuará automáticamente en <strong id="countdown-timer">1 minuto</strong>.</p>
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
  let ronda_simon = 0;
  const trialbaseSimonPractica = generarTrialBaseSimon(12, "Practica", jsPsych);
  const trialBaseSimon = generarTrialBaseSimon(60, "Prueba", jsPsych);

  console.log(trialbaseSimonPractica, trialBaseSimon);

  const instruccion_practica_simon = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>

      Estás a punto de participar en un estudio donde se te mostrará uno de dos estímulos:
      <strong>un círculo rojo o un círculo azul</strong>.<br><br>
      El círculo aparecerá en distintas posiciones (a la izquierda o a la derecha de la pantalla),
      pero <strong>su ubicación no es relevante</strong>.<br><br>
      Tu tarea es responder lo más rápido posible al <strong>color del círculo</strong>:<br><br>
      &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Si ves un círculo <strong>azul</strong>, presiona la tecla <strong>SHIFT izquierda</strong>.<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Si ves un círculo <strong>rojo</strong>, presiona la tecla <strong>SHIFT derecha</strong>.
    
      <br><br>
    <p>Vas a comenzar con unos ensayos de practica en los que se te dara una retroalimentacion, para que te familiarizes con la tarea</p>
    </div>

    <br>

    <div style='display: flex; justify-content: space-around; margin-top: 20px; font-size: 20px;'>
        <div style='text-align: center;'>
          <div class="circle azul"></div>
          <p class="response-option-left"><strong>SHIFT Izquierda</strong></p>
        </div>
        <div>
          <div class="circle rojo"></div>
          <p class="response-option-right"><strong>SHIFT Derecha</strong></p>
        </div>
    </div>

    <br><br>
    <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>

    `,
    choices: ["Space"],
  };

  const instruccion_test_simon = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>
      <strong>Ahora comenzarás la tarea de verdad.</strong>
      <br><br>
      Recuerda, no se te indicará si cometes un error, así que debes estar muy atento.
      No olvides:<br><br>
        &rarr; Si ves un círculo <strong>rojo</strong>, presiona la tecla <strong>SHIFT izquierda</strong>.<br>
        &rarr; Si ves un círculo <strong>azul</strong>, presiona la tecla <strong>SHIFT derecha</strong>.
    </div>
    <br><br>
    <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>
    `,
    choices: ["Space"],
  };

  const prueba_simons = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: function () {
      const color_code = jsPsych.evaluateTimelineVariable("stim");
      const xpos_actual = jsPsych.evaluateTimelineVariable("xpos");
      const color_class = color_code == 1 ? "azul" : "rojo";

      return `
        <div class="stim-container">
          <div id="circle-simon" class="circle ${color_class}"
                style="left: calc(50% + ${xpos_actual}px);">
          </div>
        </div>

        
      ${footer_simon}
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
      task: "Response",
      fase: function () {
        return jsPsych.evaluateTimelineVariable("fase");
      },
      ronda: function () {
        return ronda_simon;
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

  const test_procedure_practica_simon = {
    timeline: [fixation, prueba_simons, feedback],
    timeline_variables: trialbaseSimonPractica,
    randomize_order: true,
  };

  const first_round_simon = {
    timeline: [fixation, prueba_simons],
    timeline_variables: trialBaseSimon,
    randomize_order: true,
    on_start: function () {
      ronda_simon = 1; // Asigna directamente 2 para la segunda ronda
    },
  };

  const second_round_simon = {
    timeline: [fixation, prueba_simons],
    timeline_variables: trialBaseSimon,
    randomize_order: true,
    on_start: function () {
      ronda_simon = 2; // Asigna directamente 2 para la segunda ronda
    },
  };

  const guardar_simon = {
    type: jsPsychCallFunction,
    async: true, // Crucial: Tells jsPsych this function will be asynchronous
    func: async function (done) {
      // 'done' is the callback function provided by jsPsych
      console.log("Iniciando guardado de datos de la tarea Simon...");

      const simonData = jsPsych.data
        .get()
        .filter({ test_part: "Simon", task: "Response" })
        .values();
      const simonPractica = simonData.filter((d) => d.fase === "Practica");
      const simonPrueba = simonData.filter((d) => d.fase === "Prueba");

      const dataToSave = {
        practica: simonPractica,
        prueba: simonPrueba,
        timestamp_completed: new Date().toISOString(),
      };

      try {
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/experiment_results/simon_results`,
          dataToSave
        );
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/current_stage`,
          "simon_completed"
        );
        console.log("Datos de Simon guardados y stage actualizado.");
        // Call 'done()' when the asynchronous operation is complete and successful
        done();
      } catch (error) {
        console.error("Error al guardar datos de Simon:", error);
        // You might want to pass an error message to done() or handle it differently
        // if the save fails and you want to stop the experiment or retry.
        done(new Error("Failed to save Simon data.")); // Pass an error to 'done'
      }
    },
    // You can still add other properties if you want a visual indication during saving
    // stimulus: '<p>Guardando datos de la tarea de Simon...</p>',
    // choices: jsPsych.NO_KEYS,
    // trial_duration: null // null or a very long duration if you rely purely on 'done()'
  };
  ///////////////////////////
  ///////STROOP//////////////
  ///////////////////////////

  //VARIABLES STROOP
  let bloque_automatizacion_stroop = 1;
  let automatizacionRespCorr = 0;
  const colors = ["rojoStroop", "azulStroop", "amarilloStroop"];

  let currentColor = "lightgray";

  // --- Generate Main Trials ---
  const trialCirculos = generarTrialBaseStroop(
    ["0", "0", "0"],
    colors,
    true,
    30,
    jsPsych,
    "Automatizacion"
  );

  // Combine main trials
  const trialBaseStroop = generarTrialsStroopCompletos(20, jsPsych, "Prueba");
  // Combine practice trials
  const trialBaseStroopPractica = generarTrialsStroopCompletos(
    4,
    jsPsych,
    "Practica"
  );
  // --- Logging for verification ---
  console.log("Trials Círculos:", trialCirculos);
  console.log("Trials Base (Práctica):", trialBaseStroopPractica);
  console.log("Trials Base (Main):", trialBaseStroop);

  const practica_color_dinamico_con_bucle = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code", // Asegura que la propiedad 'code' de la respuesta sea usada para la validación
    stimulus: function () {
      return `
    <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>
      <p><strong>Esta es una fase de automatizacion importante.</strong></p>
      <p>Verás círculos de colores y debes presionar la tecla según el color:</p>
        <p>1 → Amarillo | 2 → Azul | 3 → Rojo</p>

        <div id="colorBox" style="width: 100px; height: 100px; margin: 30px auto; background-color: ${currentColor}; border: 2px solid #000;"></div>

        <p>Practica libremente con las teclas para verificar los colores.</p>
        <p>Luego harás bloques donde deberás mantener buena precisión y velocidad, si te sientes ya listo.</p>
      </div>
      <br><br>
      <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>
    `;
    },
    choices: ["Digit1", "Digit2", "Digit3", "Space"],
    on_finish: function (data) {
      const key = data.response;
      if (key === "Digit1") {
        currentColor = "rgb(255, 190, 60)";
      } else if (key === "Digit2") {
        currentColor = "rgb(65, 105, 225)";
      } else if (key === "Digit3") {
        currentColor = "rgb(220, 20, 60)";
      }
      data.practice_key_pressed = key;
    },
  };

  const practica_colores = {
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

  let ronda_stroop = 0;

  const automatizacion_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: function () {
      const color_class = jsPsych.evaluateTimelineVariable("color");

      return `
      <div class="stim-container">
        <div id="circle-stroop" class="circle ${color_class}"
             style="position: absolute;">
        </div>
      </div>

      ${footer_stroop}
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
      fase: function () {
        return jsPsych.evaluateTimelineVariable("fase");
      },
      task: "Response",
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
      data.bloque = bloque_automatizacion_stroop;
      data.test_part = jsPsych.evaluateTimelineVariable("test_part");

      // Determinar la respuesta del color
      const responseKeyInfo = {
        Digit3: getColorInfo("rojoStroop"),
        Digit2: getColorInfo("azulStroop"),
        Digit1: getColorInfo("amarilloStroop"),
      };
      data.colorResponse =
        responseKeyInfo[data.response]?.name || "Sin Respuesta";

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
      return `
      <div class="stim-container">
        <p id="word-stroop" class="${color_class}" style="font-size: 80px; font-weight: bold; position: absolute;">${word}</p>
      </div>

      ${footer_stroop}
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
      ronda: function () {
        return ronda_stroop;
      },
      fase: function () {
        return jsPsych.evaluateTimelineVariable("fase");
      },
      task: "Response",
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

      // Determinar la respuesta del color
      const responseKeyInfo = {
        Digit3: getColorInfo("rojoStroop"),
        Digit2: getColorInfo("azulStroop"),
        Digit1: getColorInfo("amarilloStroop"),
      };
      data.colorResponse =
        responseKeyInfo[data.response]?.name || "Sin Respuesta";

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

  const fase_automatizacion = {
    timeline: [test_automatizacion_stroop],
    loop_function: function (data) {
      const all_trials = data
        .values()
        .filter((trial) => trial.task === "Response");

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
        bloque_automatizacion_stroop,
        "] Correctas:",
        correct_trials.length,
        "RT promedio:",
        rt_avg
      );
      console.log("Bloques consecutivos exitosos:", automatizacionRespCorr);
      if (bloque_automatizacion_stroop === 5) {
        return false;
      }
      bloque_automatizacion_stroop = (bloque_automatizacion_stroop || 0) + 1;
      // Terminar el bucle si se han completado 2 bloques consecutivos exitosos
      return !(automatizacionRespCorr >= 2);
    },
  };

  const first_round_stroop = {
    timeline: [fixation, prueba_stroop],
    timeline_variables: trialBaseStroop,
    randomize_order: true,
    on_start: function () {
      ronda_stroop = 1; // Asigna directamente 2 para la segunda ronda
    },
  };

  const second_round_stroop = {
    timeline: [fixation, prueba_stroop],
    timeline_variables: trialBaseStroop,
    randomize_order: true,
    on_start: function () {
      ronda_stroop = 2; // Asigna directamente 2 para la segunda ronda
    },
  };

  const guardar_stroop = {
    type: jsPsychCallFunction,
    async: true, // Crucial: Tells jsPsych this function will be asynchronous
    func: async function (done) {
      const stroopData = jsPsych.data
        .get()
        .filter({ test_part: "Stroop", task: "Response" })
        .values();
      const stroopAutomatizacion = stroopData.filter(
        (d) => d.fase === "Automatizacion"
      );
      const stroopPractica = stroopData.filter((d) => d.fase === "Practica");
      const stroopPrueba = stroopData.filter((d) => d.fase === "Prueba");

      const dataToSave = {
        automatizacion: stroopAutomatizacion,
        practica: stroopPractica,
        prueba: stroopPrueba,
        timestamp_completed: new Date().toISOString(),
      };

      try {
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/experiment_results/stroop_results`,
          dataToSave
        );
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/current_stage`,
          "stroop_completed"
        );
        console.log("Datos de Stroop guardados y stage actualizado.");
        done();
      } catch (error) {
        console.error("Error al guardar datos de Stroop:", error);
        done(new Error("Failed to save Simon data.")); // Pass an error to 'done'
      }
    },
  };
  const test_practica_stroop = {
    timeline: [fixation, prueba_stroop, feedback],
    timeline_variables: trialBaseStroopPractica,
    randomize_order: true,
  };

  const instruccion_practica_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>
      Ahora en lugar de círculos verás palabras de colores a las que también deberás responder con las teclas.<br><br>
      <strong>¡MUY IMPORTANTE!</strong> No debes leer la palabra. Debes fijarte únicamente en el color con el que está pintada. Enfócate solo en el color de la tinta.<br><br>
      Por ejemplo, puede que leas la palabra '<em>azul</em>', pero esté pintada de color <strong>rojo</strong>.<br><br>
      Debes presionar la tecla correspondiente al color de la tinta.<br><br>
      <u>Recuerda:</u><br><br>
      &nbsp;&nbsp;&nbsp;&nbsp;Amarillo → Tecla 1<br><br>
      &nbsp;&nbsp;&nbsp;&nbsp;Azul → Tecla 2<br><br>
      &nbsp;&nbsp;&nbsp;&nbsp;Rojo → Tecla 3<br><br>
      Vas a comenzar con unos pocos ensayos de práctica para que te familiarices con la tarea.
    </div>

    <br><br>
      <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>

    `,
    choices: ["Space"],
  };
  const instruccion_stroop = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>
          Ahora comenzarás la tarea de verdad.<br><br>
          Recuerda, no se te indicará si cometes un error, así que debes estar muy atento.<br><br>
          Debes fijarte únicamente en el color con el que está pintada. Enfócate solo en el color de la tinta.<br><br>
          <strong>¡TÚ PUEDES!</strong> Mantente concentrado durante toda la tarea.
        </div>

    <br><br>
      <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>

    `,
    choices: ["Space"],
  };
  ///////////////////////////////
  ////////////////GONOGO
  //////////////////////////////
  const trialbasegonogo = generarTrialBaseGonogo(jsPsych, 60, "Prueba");
  const trialpracticegonogo = generarTrialBaseGonogo(jsPsych, 20, "Practica");

  console.log(trialpracticegonogo);
  console.log(trialbasegonogo);

  let ronda_actual_gonogo = 0;

  const instruccion_practica_gonogo = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
    <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>
      <p>En esta tarea verás una serie de letras que aparecerán en la pantalla: la letra <strong>'P'</strong> y la letra <strong>'R'</strong>.</p>
  
      <p>Cuando veas una <strong>'P'</strong>, debes responder presionando la barra espaciadora.</p>
      
      <p>Cuando veas una <strong>'R'</strong>, <u>no debes hacer nada</u>. ¡No respondas!</p>
      
      <p>La mayoría de las letras que aparecerán serán <strong>'P'</strong>, así que mantente atento.</p>
      
      <p>Vas a comenzar con unos pocos ensayos de práctica para que te familiarices con la tarea.</p>
    </div>

    <br><br>
      <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>

    `,
    choices: ["Space"],
  };

  const go_nogo_trial_block = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: function () {
      const pos = jsPsych.evaluateTimelineVariable("gPos");
      const letra = jsPsych.evaluateTimelineVariable("letter");

      const cells = Array(4).fill(
        `<div class="cell"><div class="star">✸</div></div>`
      );

      cells[
        pos
      ] = `<div class="cell"><div id="star" class="star" style="display: none;">✸</div><div id="error" class="error" style="display: none;">X</div><div id="letter" class="letter">${letra}</div></div>`;
      return `<div class="grid">${cells.join("")}</div>${footer_gonogo}
      `;
    },
    choices: ["Space"],
    on_load: function () {
      setTimeout(() => {
        const el = document.getElementById("letter");
        if (el) el.style.display = "none";
        const al = document.getElementById("star");
        if (al) al.style.display = "block";
      }, gVisibleStimul);
    },
    response_ends_trial: false,
    data: {
      task: "Response", // Deja esto como 'response' para que se capture data.response, data.rt, etc.
      go_nogo_type: function () {
        const letra = jsPsych.evaluateTimelineVariable("letter");
        return letra === "P" ? "Go" : "NoGo";
      },
      stim_letter: function () {
        return jsPsych.evaluateTimelineVariable("letter");
      },
      letter_pos: function () {
        return jsPsych.evaluateTimelineVariable("gPos");
      },
      ronda: function () {
        return ronda_actual_gonogo; // Asigna el valor actual de la ronda
      },
      fase: function () {
        return jsPsych.evaluateTimelineVariable("fase");
      },
    },
    trial_duration: gTimeResponse - 50,
    save_trial_parameters: {
      stimulus: false,
    },
    on_finish: function (data) {
      data.test_part = jsPsych.evaluateTimelineVariable("test_part");
      const current_letter = data.stim_letter;
      const participant_response = data.response; // Contiene 'Space' o null
      let correct = false;
      if (current_letter === "P") {
        if (participant_response === "Space") {
          correct = true;
        } else {
          correct = false;
        }
      } else if (current_letter === "R") {
        if (participant_response === null) {
          correct = true;
        } else {
          correct = false;
        }
      }

      data.correct = correct;
    },
  };

  const instruccion_test_gonogo = {
    type: jsPsychHtmlKeyboardResponse,
    key_property_for_validation: "code",
    stimulus: `
      <div style='text-align: left; font-size: 20px; margin: auto; line-height: 1.6;'>
        <p>Ahora comenzarás la tarea de verdad.</p>
        <p>Recuerda, no se te indicará si cometes un error, así que debes estar muy atento.</p>
        <p>Responde presionando la barra espaciadora cuando veas una <strong>'P'</strong> y no respondas cuando veas una <strong>'R'</strong>.</p>
        <p>La mayoría de las letras serán 'P', pero mantente concentrado durante toda la tarea.</p>
      </div>

      <br><br>
      <p style='font-size: 20px;'><strong>Presiona espacio para continuar</strong></p>

      `,
    choices: ["Space"],
  };
  // Timeline para mostrar el feedback visual del error: grid con estrella tachada
  const gonogo_error_feedback = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      const last_trial_data = jsPsych.data.get().last(1).values()[0];
      const pos = last_trial_data.letter_pos;

      // Creamos la grilla
      const cells = Array(4).fill(
        `<div class="cell"><div class="star">✸</div></div>`
      );

      // En la posición con error, mostramos la estrella con la X encima
      cells[pos] = `
        <div class="cell">
          <div id="star" class="star">✸</div>
          <div id="error" class="error">☓</div>
        </div>`;
      return `<div class="grid">${cells.join("")}</div>${footer_gonogo}`;
    },
    choices: "NO_KEYS",
    trial_duration: gTimeFeedbaak + 500,
    on_load: function () {
      setTimeout(() => {
        const el = document.getElementById("error");
        if (el) el.style.display = "none";
        const al = document.getElementById("star");
        if (al) al.style.display = "block";
      }, gTimeFeedbaak + 300);
    },
  };

  // Nodo condicional que solo muestra el feedback si hubo error
  const gonogo_feedback_node = {
    timeline: [gonogo_error_feedback],
    conditional_function: function () {
      const last_trial = jsPsych.data.get().last(1).values()[0];
      return !last_trial.correct; // Solo mostrar si no fue correcto
    },
  };

  const test_procedure_practice_gonogo = {
    timeline: [go_nogo_trial_block, gonogo_feedback_node],
    timeline_variables: trialpracticegonogo,
    randomize_order: true,
  };

  const first_round_go_nogo = {
    timeline: [go_nogo_trial_block],
    on_start: function () {
      ronda_actual_gonogo = 1; // Asigna directamente 1 para la primera ronda
    },
    timeline_variables: trialbasegonogo,
    randomize_order: true,
  };

  const second_round_go_nogo = {
    timeline: [go_nogo_trial_block],
    on_start: function () {
      ronda_actual_gonogo = 2; // Asigna directamente 2 para la segunda ronda
    },
    timeline_variables: trialbasegonogo,
    randomize_order: true,
  };

  const guardar_go_nogo = {
    type: jsPsychCallFunction,
    async: true,
    func: async function (done) {
      const gonogoData = jsPsych.data
        .get()
        .filter({ test_part: "Go/NoGo", task: "Response" })
        .values();
      console.log(gonogoData);
      const gonogoPractica = gonogoData.filter((d) => d.fase === "Practica");
      const gonogoPrueba = gonogoData.filter((d) => d.fase === "Prueba");

      const dataToSave = {
        practica: gonogoPractica,
        prueba: gonogoPrueba,
        timestamp_completed: new Date().toISOString(),
      };

      try {
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/experiment_results/gonogo_results`,
          dataToSave
        );
        await saveToFirebaseRobustly(
          `participants/${participantInfo.groupId}/${participantInfo.participantId}/current_stage`,
          "gonogo_completed"
        );
        console.log("Datos de Go/NoGo guardados y stage actualizado.");
        done();
      } catch (error) {
        console.error("Error al guardar datos de Go/NoGo:", error);
        done(new Error("Failed to save Simon data.")); // Pass an error to 'done'
      }
    },
  };

  const inter_round_break_and_countdown = {
    timeline: [break_45_seconds_trial, countdown_trial],
  };

  const simon_block_completo = {
    timeline: [
      instruccion_practica_simon,
      countdown_trial,
      test_procedure_practica_simon,
      instruccion_test_simon,
      countdown_trial,
      first_round_simon,
      inter_round_break_and_countdown,
      second_round_simon,
      guardar_simon,
      break_60_seconds_trial,
    ],
  };

  const stroop_block_completo = {
    timeline: [
      practica_colores,
      countdown_trial,
      fase_automatizacion,
      break_after_automation_trial,
      instruccion_practica_stroop,
      countdown_trial,
      test_practica_stroop,
      instruccion_stroop,
      countdown_trial,
      first_round_stroop,
      inter_round_break_and_countdown,
      second_round_stroop,
      guardar_stroop,
      break_60_seconds_trial,
    ],
  };

  const gonogo_block_completo = {
    timeline: [
      instruccion_practica_gonogo,
      countdown_trial,
      test_procedure_practice_gonogo,
      instruccion_test_gonogo,
      countdown_trial,
      first_round_go_nogo,
      inter_round_break_and_countdown,
      second_round_go_nogo,
      guardar_go_nogo,
    ],
  };

  if (
    initialProgressStage === "demographics_completed" ||
    initialProgressStage === "start"
  ) {
    // Si demográficos acabados o es un inicio fresco
    timeline.push(
      fullscreen_trial,
      simon_block_completo,
      stroop_block_completo,
      gonogo_block_completo,
      fullscreen_trial_exit
    );
  } else if (initialProgressStage === "simon_completed") {
    timeline.push(
      fullscreen_trial,
      stroop_block_completo,
      gonogo_block_completo,
      fullscreen_trial_exit
    );
  } else if (initialProgressStage === "stroop_completed") {
    timeline.push(
      fullscreen_trial,
      gonogo_block_completo,
      fullscreen_trial_exit
    );
  }
  jsPsych.run(timeline);
}

function generarTrialBaseSimon(numTrials, type, jsPsych) {
  // 1. Selecciona el contenedor del experimento
  let contenedorVideo = document.getElementById("jspsych-display");
  let gVideoWidth = window.innerWidth;

  if (contenedorVideo) {
    gVideoWidth = contenedorVideo.offsetWidth;
    console.log("El ancho de jspsych-display es:", gVideoWidth);
  } else {
    console.warn(
      "No se encontró el contenedor jspsych-display. Se usará el valor por defecto:",
      gVideoWidth
    );
  }

  // 2. Definir posiciones relativas al ancho
  let positions = [0, 0];
  let percentages = [0.35, 0.7];
  let num = 0;

  while (positions.length < 6) {
    let offset = (gVideoWidth / 2) * percentages[num];
    positions.push(offset);
    positions.push(-offset);
    num += 1;
  }

  let stim = [1, 2]; // 1 = rojo, 2 = azul

  // 3. Generar todas las combinaciones posibles de posiciones × estímulos
  let allCombinations = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < stim.length; j++) {
      allCombinations.push({
        xpos: positions[i],
        stim: stim[j],
        test_part: "Simon",
        fase: type,
      });
    }
  }

  // 4. Repetir o recortar combinaciones para alcanzar numTrials
  let trialbase = [];
  while (trialbase.length < numTrials) {
    trialbase = trialbase.concat(
      jsPsych.randomization.shuffle(allCombinations)
    );
  }
  trialbase = trialbase.slice(0, numTrials);

  // 5. Devolver solo la lista de trials
  return trialbase;
}

function generarTrialsStroopCompletos(numTrialsPorTipo, jsPsych, type) {
  const words = ["Rojo", "Azul", "Amarillo"];
  const colors = ["rojoStroop", "azulStroop", "amarilloStroop"];
  const words_neutras = ["XXXXX", "XXXXX", "XXXXX"];

  // Generar trials congruentes
  const trialsCongruentes = generarTrialBaseStroop(
    words,
    colors,
    true, // matchesOK = true para congruentes
    numTrialsPorTipo,
    jsPsych,
    type
  );

  // Generar trials incongruentes
  const trialsIncongruentes = generarTrialBaseStroop(
    words,
    colors,
    false, // matchesOK = false para incongruentes
    numTrialsPorTipo,
    jsPsych,
    type
  );

  // Generar trials neutras
  const trialsNeutras = generarTrialBaseStroop(
    words_neutras,
    colors,
    true, // matchesOK no importa para neutras, se usa para mantener la estructura
    numTrialsPorTipo,
    jsPsych,
    type
  );

  // Combinar todos los trials y mezclarlos aleatoriamente
  let allTrials = trialsCongruentes
    .concat(trialsIncongruentes)
    .concat(trialsNeutras);
  allTrials = jsPsych.randomization.shuffle(allTrials);

  return allTrials;
}

function generarTrialBaseStroop(words, colors, matchesOK, reps, jsPsych, type) {
  let congruencia;

  if (words.includes("XXXXX")) {
    congruencia = "Neutra";
  } else if (matchesOK) {
    congruencia = "Congruente";
  } else {
    congruencia = "Incongruente";
  }

  const allCombos = jsPsych.randomization.factorial(
    {
      word: [1, 2, 3],
      color: [1, 2, 3],
    },
    1
  );

  const factors = allCombos.filter((c) =>
    matchesOK ? c.word === c.color : c.word !== c.color
  );

  // Lista total de estímulos
  let stimuli = [];

  // Repetir y mezclar sin repeticiones consecutivas
  while (stimuli.length < reps) {
    const remaining = jsPsych.randomization.shuffleNoRepeats(factors);
    stimuli = stimuli.concat(remaining);
  }

  // Cortar a reps exactos
  stimuli = stimuli.slice(0, reps);

  const outlist = stimuli.map((item) => {
    return {
      word: words[item.word - 1],
      color: colors[item.color - 1],
      congruencia: congruencia,
      test_part: "Stroop",
      fase: type,
    };
  });

  return outlist;
}

function generarTrialBaseGonogo(jsPsych, totalTrials, type) {
  // Calcular número de P (Go) y R (No-Go) con proporción 80/20
  let numP = Math.round(totalTrials * 0.7);
  let numR = totalTrials - numP;

  // Asegurarse de que la suma dé exactamente totalTrials
  if (numP + numR !== totalTrials) {
    // Ajustar según el caso (prioriza mantener el total correcto)
    numP = totalTrials - numR;
  }

  // Crear el diseño base
  const createDesign = () => {
    const design = [];

    for (let i = 0; i < numP; i++) {
      design.push({
        letter: "P",
        gPos: Math.floor(Math.random() * 4),
        test_part: "Go/NoGo",
        fase: type,
      });
    }
    for (let i = 0; i < numR; i++) {
      design.push({
        letter: "R",
        gPos: Math.floor(Math.random() * 4),
        test_part: "Go/NoGo",
        fase: type,
      });
    }

    return design;
  };

  // Mezclar el diseño
  const shuffleDesign = (design) => {
    return jsPsych.randomization.shuffle([...design]);
  };

  // Crear el diseño final
  const fullDesign = shuffleDesign(createDesign());

  // Contar cuántos "P" y "R" hay (verificación)
  const count = fullDesign.reduce(
    (acc, trial) => {
      if (trial.letter === "P") acc.P++;
      if (trial.letter === "R") acc.R++;
      return acc;
    },
    { P: 0, R: 0 }
  );

  console.log("Total de ensayos:", totalTrials);
  console.log("Total de P (Go):", count.P);
  console.log("Total de R (No-Go):", count.R);

  return fullDesign;
}

function getColorInfo(colorClass) {
  switch (colorClass) {
    case "rojoStroop":
      return { value: 3, name: "Rojo", key: "Digit3" };
    case "azulStroop":
      return { value: 2, name: "Azul", key: "Digit2" };
    case "amarilloStroop":
      return { value: 1, name: "Amarillo", key: "Digit1" };
    default:
      return { value: 0, name: "Sin Respuesta", key: "" };
  }
}

function getSimonTrialInfo(stimCode, xPos) {
  const color = stimCode === 1 ? "Azul" : "Rojo";

  let position;
  if (xPos < 0) {
    position = "Izquierda";
  } else if (xPos > 0) {
    position = "Derecha";
  } else {
    position = "Neutra";
  }

  let congruence;
  if (
    (position === "Izquierda" && stimCode === 1) || // Azul a la izquierda
    (position === "Derecha" && stimCode === 2) // Rojo a la derecha
  ) {
    congruence = "Congruente";
  } else if (position === "Neutra") {
    congruence = "Neutra";
  } else {
    congruence = "Incongruente";
  }

  // Define las respuestas correctas para simplificar el on_finish
  const correctResponsesSimon = {
    1: "ShiftLeft", // Para azul (stimCode 1)
    2: "ShiftRight", // Para rojo (stimCode 2)
  };

  return {
    color: color,
    position: position,
    congruence: congruence,
    correctResponse: correctResponsesSimon[stimCode],
  };
}
