import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged, // Aunque no lo uses directamente aquí, es bueno tenerlo si necesitas escuchar cambios de estado
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get, // ¡Añadimos 'get' para leer datos!
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js"; // Para Realtime Database

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// Hace que 'realtimeDb' (la instancia de Realtime Database) sea global o accesible para tu código jsPsych
window.firebaseDb = db; // Renombrado de 'realtimeDb' a 'db' para consistencia con tu código

console.log(
  "Firebase inicializado y Realtime Database disponible en window.firebaseDb"
);

// 🔐 UID del administrador (asegúrate de que este UID sea el correcto para tu cuenta de admin)
const ADMIN_UID = "GY7cuY08o9NUTQIm7V9CtcRlpXA3"; // ¡Verifica este UID!

// Elementos del DOM
const loginForm = document.getElementById("login-form");
const dataDisplayDiv = document.getElementById("data-display"); // Asegúrate de tener este div en tu HTML
const errorMessageSpan = document.getElementById("error-message");
const logoutButton = document.getElementById("logout-button"); // Añade un botón de "Cerrar Sesión" en tu HTML
const loginSection = document.getElementById("login-section"); // La sección que contiene el formulario de login
const adminSection = document.getElementById("admin-section"); // La sección donde mostrarás los datos y herramientas de admin
const dowloadButton = document.getElementById("download-button"); // Añade un botón de "Cerrar Sesión" en tu HTML

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario logeado
    if (user.uid === ADMIN_UID) {
      console.log("Admin logeado.");
      cargarDatos(); // Carga los datos automáticamente si es el admin y ya está logeado
      if (logoutButton) logoutButton.style.display = "block";
    } else {
      // Otro usuario logeado que no es el admin, cierra la sesión
      console.log("Usuario no administrador logeado, cerrando sesión.");
      signOut(auth);
      if (loginSection) loginSection.style.display = "block";
      if (adminSection) adminSection.style.display = "none";
    }
  } else {
    // No hay usuario logeado
    console.log("Nadie logeado.");
    if (loginSection) loginSection.style.display = "block";
    if (adminSection) adminSection.style.display = "none";
    if (logoutButton) logoutButton.style.display = "none";
    if (logoutButton) dowloadButton.style.display = "none";
    if (dataDisplayDiv) dataDisplayDiv.innerHTML = ""; // Limpia los datos si no hay admin
  }
});

async function cargarDatos() {
  try {
    // Oculta la sección de login y muestra la sección de admin
    if (loginSection) loginSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";

    const allParticipantsData = await loadAllExperimentDataRobustly(
      "participants"
    ); // Carga todos los datos bajo 'participants'
    //const response = await fetch("./data/data.json");
    //const allParticipantsData = await response.json();

    if (allParticipantsData) {
      console.log("Datos de todos los participantes:", allParticipantsData);
      // Aquí puedes agregar la lógica para mostrar los datos en tu HTML
      if (dataDisplayDiv) {
        dataDisplayDiv.innerHTML = ""; // limpiar antes
        dataDisplayDiv.innerHTML = "<h2>Datos de Todos los Participantes:</h2>";

        //const tabla = crearTablaDeDatos(allParticipantsData);
        //dataDisplayDiv.appendChild(tabla);

        // Ejemplo: Mostrar un resumen
        const numGroups = Object.keys(allParticipantsData).length;
        dataDisplayDiv.innerHTML += `<p><b>Total de grupos:</b> ${
          numGroups - 1
        }</p>`;
        for (const groupId in allParticipantsData) {
          let totalHombres = 0;
          let totalMujeres = 0;
          if (groupId === "Piloto") continue;
          const numParticipantsInGroup = Object.keys(
            allParticipantsData[groupId]
          ).length;
          const nombreBonito = separarPorMayusculas(groupId);
          dataDisplayDiv.innerHTML += `<p><b>Grupo ${nombreBonito}:</b> ${numParticipantsInGroup} participantes</p>`;
          for (const participantId in allParticipantsData[groupId]) {
            const participantData = allParticipantsData[groupId][participantId];
            if (participantData.demographics.gender === "Hombre") {
              totalHombres++;
            } else if (participantData.demographics.gender === "Mujer") {
              totalMujeres++;
            }
          }
          dataDisplayDiv.innerHTML += `<p>Total de Hombres →  ${totalHombres}</p>`;
          dataDisplayDiv.innerHTML += `<p>Total de Mujeres →  ${totalMujeres}</p>`;
        }
      }
    } else {
      if (dataDisplayDiv) {
        dataDisplayDiv.innerHTML =
          "<p>No se encontraron datos de participantes.</p>";
      }
    }
  } catch (error) {
    console.error("Error al cargar los datos del administrador:", error);
    if (dataDisplayDiv) {
      dataDisplayDiv.innerHTML = `<p style="color: red;">Error al cargar los datos: ${error.message}</p>`;
    }
  }
}
function separarPorMayusculas(texto) {
  return texto
    .replace(/([A-Z])/g, " $1") // Agrega un espacio antes de cada mayúscula
    .replace(/^./, (str) => str.toUpperCase()); // Capitaliza la primera letra
}
async function loadAllExperimentDataRobustly(path, retries = 3, delay = 1000) {
  const dataRef = ref(db, path); // Usa 'db' aquí, que es tu instancia de Realtime Database
  console.log("Intentando obtener datos de la ruta:", path);
  for (let i = 0; i <= retries; i++) {
    try {
      const snapshot = await get(dataRef);
      if (snapshot.exists()) {
        console.log(
          `Datos cargados con éxito desde ${path} (intento ${i + 1})`
        );
        return snapshot.val(); // Retorna los datos como un objeto JavaScript
      } else {
        console.log(`No se encontraron datos en ${path} (intento ${i + 1})`);
        return null; // No hay datos en la ruta especificada
      }
    } catch (error) {
      console.error(
        `Error al cargar desde ${path} (intento ${i + 1}/${retries + 1}):`,
        error
      );
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `Fallo definitivo al cargar datos desde ${path} después de múltiples reintentos.`
        );
        throw new Error(
          "Fallo al cargar desde Firebase después de reintentos."
        );
      }
    }
  }
}

function crearTablaDeDatos(data) {
  const columnas = [
    "Id",
    "Grupo",
    "Sexo",
    "Edad",
    "Maneja",
    "Concentracion al estudiar",
    "Escucha musica al estudiar",
    "Genero que escucha",
    "Tiempo en pantallas",
    "Semestre",
    "Horas de sueño",
    "Prueba",
    "# Ensayo",
    "Fase",
    "Ronda",
    "Estimulo",
    "Tipo",
    "Respuesta",
    "Respuesta Correcta",
    "Correcta",
    "Intrusion",

    "RT",
  ];

  const tabla = document.createElement("table");
  tabla.classList.add("table", "table-striped", "table-bordered", "mt-3");

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  columnas.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const groupId in data) {
    if (groupId === "Piloto") continue;
    let id_participante = 0;
    for (const participantId in data[groupId]) {
      id_participante++;
      const participantData = data[groupId][participantId];
      const demografics = participantData.demographics || {};

      const stroopData = participantData?.experiment_results?.stroop_results;
      const ensayosStroopPractica = stroopData?.practica || [];
      const ensayosStroop = stroopData?.prueba || [];

      const gonogoData = participantData?.experiment_results?.gonogo_results;
      const ensayosGonogoPractica = gonogoData?.practica || [];
      const ensayosGonogo = gonogoData?.prueba || [];

      const ensayosTest = [
        ensayosStroopPractica,
        ensayosStroop,
        ensayosGonogoPractica,
        ensayosGonogo,
      ];

      ensayosTest.forEach((ensayo) => {
        if (!ensayo) {
          return;
        }
        agregarEnsayosATabla(
          ensayo,
          "No Clase",
          tbody,
          columnas,
          groupId,
          id_participante,
          demografics
        );
      });
    }
  }

  tabla.appendChild(tbody);
  return tabla;
}

function agregarEnsayosACSV(
  ensayos,
  prueba,
  columnas,
  groupId,
  participantId,
  demografics
) {
  let numEnsayo = 0;
  const filas = [];

  function verColor(resp) {
    switch (resp) {
      case "Digit1":
        return "Amarillo";
      case "Digit2":
        return "Azul";
      case "Digit3":
        return "Rojo";
      default:
        return "No Respondio";
    }
  }

  function verLado(resp) {
    switch (resp) {
      case "ShiftLeft":
        return "Izquierda";
      case "ShiftRight":
        return "Derecha";
      default:
        return "No Respondio";
    }
  }

  ensayos.forEach((ensayo) => {
    const fila = columnas.map((col) => {
      switch (col) {
        case "Grupo":
          return separarPorMayusculas(groupId);
        case "Id":
          return participantId || ensayo.Id;
        case "Sexo":
          return demografics.gender || "";
        case "Edad":
          return demografics.age || "";
        case "Maneja":
          return demografics.drive || "";
        case "Juega Videojuegos":
          return demografics.videogames || "";
        case "Concentracion al estudiar":
          return demografics.concentration || "";
        case "Escucha musica al estudiar":
          return demografics.musicStudy || "";
        case "Genero que escucha":
          return demografics.musicGenre || "";
        case "Tiempo en pantallas":
          return demografics.screenTime || "";
        case "Semestre":
          return demografics.semester || "";
        case "Horas de sueño":
          return demografics.sleep || "";
        case "Prueba":
          return ensayo.test_part || prueba;
        case "# Ensayo":
          if (ensayo.ronda === 2 && numEnsayo === 60) numEnsayo = 0;
          numEnsayo++;
          return numEnsayo;
        case "Fase":
          return ensayo.fase || "";
        case "Ronda":
          return ensayo.ronda || 0;
        case "Estimulo":
          if (ensayo.test_part === "Stroop")
            return ensayo.stimWord + "/" + ensayo.stimColor;
          if (ensayo.test_part === "Go/NoGo") return ensayo.stim_letter || "";
          return "";
        case "Tipo":
          if (ensayo.test_part === "Stroop") {
            if (ensayo.stimWord === "XXXXX") {
              return "Neutra";
            } else if (ensayo.stimWord === ensayo.stimColor) {
              return "Congruente";
            } else {
              return "Incongruente";
            }
          }
          if (ensayo.test_part === "Go/NoGo") return "No aplica";
          return "";
        case "Respuesta":
          if (ensayo.test_part === "Stroop")
            return verColor(ensayo.response) || "No Respondio";
          if (ensayo.test_part === "Go/NoGo") {
            return ensayo.response === "Space" ? "Go" : "NoGo";
          }
          return "";
        case "Respuesta Correcta":
          if (ensayo.test_part === "Stroop")
            return verColor(ensayo.correct_response) || "";
          if (ensayo.test_part === "Go/NoGo") return ensayo.go_nogo_type || "";
          return "";
        case "Correcta":
          return ensayo.correct ? "Si" : "No";
        case "Intrusion":
          if (ensayo.test_part !== "Stroop") return "No Aplica";
          if (
            ensayo.stimWord !== ensayo.stimColor &&
            ensayo.stimWord !== "XXXXX" &&
            ensayo.stimWord === verColor(ensayo.response)
          ) {
            return "Si";
          } else if (
            ensayo.stimWord !== ensayo.stimColor &&
            ensayo.stimWord !== "XXXXX"
          ) {
            return "No";
          }
          return "No Aplica";
        case "RT":
          return ensayo.rt || "No Respondio";
        default:
          return ensayo[col] !== undefined ? ensayo[col] : "";
      }
    });

    filas.push(fila.map((val) => `"${val}"`).join(";"));
  });

  return filas;
}

function crearCSVDeDatos(data) {
  const columnas = [
    "Id",
    "Grupo",
    "Sexo",
    "Edad",
    "Maneja",
    "Concentracion al estudiar",
    "Escucha musica al estudiar",
    "Genero que escucha",
    "Tiempo en pantallas",
    "Semestre",
    "Horas de sueño",
    "Prueba",
    "# Ensayo",
    "Fase",
    "Ronda",
    "Estimulo",
    "Tipo",
    "Respuesta",
    "Respuesta Correcta",
    "Correcta",
    "Intrusion",
    "RT",
  ];

  let csvContent = columnas.join(";") + "\n";

  for (const groupId in data) {
    if (groupId === "Piloto") continue;

    let id_participante = 0;
    for (const participantId in data[groupId]) {
      id_participante++;
      const participantData = data[groupId][participantId];
      const demografics = participantData.demographics || {};

      const stroopData = participantData?.experiment_results?.stroop_results;
      const ensayosStroopPractica = stroopData?.practica || [];
      const ensayosStroop = stroopData?.prueba || [];

      const gonogoData = participantData?.experiment_results?.gonogo_results;
      const ensayosGonogoPractica = gonogoData?.practica || [];
      const ensayosGonogo = gonogoData?.prueba || [];

      const ensayosTest = [
        ensayosStroopPractica,
        ensayosStroop,
        ensayosGonogoPractica,
        ensayosGonogo,
      ];

      ensayosTest.forEach((ensayoSet) => {
        if (!ensayoSet) return;

        // Aquí usamos tu misma lógica de parseo
        const filasCSV = agregarEnsayosACSV(
          ensayoSet,
          "No Clase",
          columnas,
          groupId,
          id_participante,
          demografics
        );

        csvContent += filasCSV.join("\n") + "\n";
      });
    }
  }

  // Descargar el CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "datos_experimento.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function agregarEnsayosATabla(
  ensayos,
  prueba,
  tbody,
  columnas,
  groupId,
  participantId,
  demografics
) {
  let numEnsayo = 0;
  function verColor(resp) {
    switch (resp) {
      case "Digit1":
        return "Amarillo";
        break;
      case "Digit2":
        return "Azul";
        break;
      case "Digit3":
        return "Rojo";
        break;
      default:
        return "No Respondio";
        break;
    }
  }
  function verLado(resp) {
    switch (resp) {
      case "ShiftLeft":
        return "Izquierda";
        break;
      case "ShiftRight":
        return "Derecha";
        break;
      default:
        return "No Respondio";
        break;
    }
  }

  ensayos.forEach((ensayo) => {
    const tr = document.createElement("tr");

    columnas.forEach((col) => {
      const td = document.createElement("td");
      switch (col) {
        case "Grupo":
          td.textContent = separarPorMayusculas(groupId);
          break;
        case "Id":
          td.textContent = participantId || ensayo.Id;
          break;
        case "Sexo":
          td.textContent = demografics.gender || "";
          break;
        case "Edad":
          td.textContent = demografics.age || "";
          break;
        case "Maneja":
          td.textContent = demografics.drive || "";
          break;
        case "Concentracion al estudiar":
          td.textContent = demografics.concentration || "";
          break;
        case "Juega Videojuegos":
          td.textContent = demografics.videogames || "";
          break;
        case "Escucha musica al estudiar":
          td.textContent = demografics.musicStudy || "";
          break;
        case "Genero que escucha":
          td.textContent = demografics.musicGenre || "";
          break;
        case "Tiempo en pantallas":
          td.textContent = demografics.screenTime || "";
          break;
        case "Semestre":
          td.textContent = demografics.semester || "";
          break;
        case "Horas de sueño":
          td.textContent = demografics.sleep || "";
          break;
        case "Prueba":
          td.textContent = ensayo.test_part || prueba;
          break;
        case "# Ensayo":
          if (ensayo.ronda === 2 && numEnsayo === 60) numEnsayo = 0;
          numEnsayo++;
          td.textContent = numEnsayo || "";
          break;
        case "Fase":
          td.textContent = ensayo.fase || "";
          break;
        case "Ronda":
          td.textContent = ensayo.ronda || "";
          break;
        case "Estimulo":
          if (ensayo.test_part === "Stroop")
            td.textContent = ensayo.stimWord + "/" + ensayo.stimColor;
          if (ensayo.test_part === "Go/NoGo")
            td.textContent = ensayo.stim_letter;
          break;
        case "Tipo":
          if (ensayo.test_part === "Stroop") {
            if (ensayo.stimWord === "XXXXX") {
              td.textContent = "Neutra";
            } else if (ensayo.stimWord === ensayo.stimColor) {
              td.textContent = "Congruente";
            } else {
              td.textContent = "Incongruente";
            }
          }
          if (ensayo.test_part === "Go/NoGo") td.textContent = "No aplica";
          break;
        case "Respuesta":
          if (ensayo.test_part === "Stroop")
            td.textContent = verColor(ensayo.response) || "No Respondio";

          if (ensayo.test_part === "Go/NoGo")
            if (ensayo.response === "Space") td.textContent = "Go";
            else td.textContent = "NoGo";
          break;
        case "Respuesta Correcta":
          if (ensayo.test_part === "Stroop")
            td.textContent = verColor(ensayo.correct_response) || "";
          if (ensayo.test_part === "Go/NoGo")
            td.textContent = ensayo.go_nogo_type || "";
          break;
        case "Correcta":
          if (ensayo.correct) {
            td.textContent = "Si";
          } else {
            td.textContent = "No";
          }
          break;
        case "Intrusion":
          td.textContent = "No Aplica";
          if (ensayo.test_part === "Stroop") {
            if (
              ensayo.stimWord !== ensayo.stimColor &&
              ensayo.stimWord !== "XXXXX" &&
              ensayo.stimWord === verColor(ensayo.response)
            ) {
              td.textContent = "Si";
            } else if (
              ensayo.stimWord !== ensayo.stimColor &&
              ensayo.stimWord !== "XXXXX"
            ) {
              td.textContent = "No";
            }
          }
          break;
        case "RT":
          if (!ensayo.rt) {
            td.textContent = "No Respondio";
          } else {
            td.textContent = ensayo.rt;
          }
          break;
        default:
          td.textContent = ensayo[col] !== undefined ? ensayo[col] : "";
          break;
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        if (user.uid !== ADMIN_UID) {
          signOut(auth); // Deslogea si no es el admin
        } else {
          errorMessageSpan.style.display = "none";
          console.log("Bienvenido, administrador."); // El onAuthStateChanged se encargará de llamar a cargarDatos()
        }
      })
      .catch((error) => {
        let mensaje;
        switch (error.code) {
          case "auth/invalid-credential":
            mensaje = "Acceso denegado. Solo administradores";
            break;
          case "auth/network-request-failed":
            mensaje = "Error de red. Verifica tu conexión.";
            break;
          default:
            mensaje = "Error desconocido: " + error.message;
            console.error("Error no manejado:", error.code, error);
            break;
        }
        errorMessageSpan.textContent = mensaje;
        errorMessageSpan.style.display = "block";
      });
  });
}

if (dowloadButton) {
  //const allParticipantsData = await loadAllExperimentDataRobustly('participants'); // Carga todos los datos bajo 'participants'
  const response = await fetch("./data/data.json");
  const allParticipantsData = await response.json();

  if (allParticipantsData) {
    dowloadButton.addEventListener("click", () => {
      crearCSVDeDatos(allParticipantsData);
    });
  }
}

// --- Cerrar sesión ---
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        console.log("Sesión cerrada.");
        // onAuthStateChanged se encargará de resetear la interfaz
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
      });
  });
}
