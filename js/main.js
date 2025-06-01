// main.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Global Variables ---
  let participantData = {}; // To store socio-demographic data
  let participantId = generateUniqueId(); // Generate a unique ID for each participant

  // References to HTML sections
  const sections = {
    consent: document.getElementById("consent-section"),
    demographics: document.getElementById("demographics-section"),
    jspsychDisplay: document.getElementById("experiment-section"),
    completionMessage: document.getElementById("completion-message"), // Add reference to completion message
  };

  // References to buttons and interactive elements from the HTML
  const acceptConsentBtn = document.getElementById("accept-consent");
  const demographicsForm = document.getElementById("demographics-form");
  const musicStudyRadios = document.querySelectorAll(
    'input[name="musicStudy"]'
  );
  const musicGenreGroup = document.getElementById("music-genre-group");

  // --- Utility Functions ---
  function generateUniqueId() {
    return "P_" + Date.now() + Math.floor(Math.random() * 1000);
  }

  // Function to show a specific section and hide others
  function showSection(sectionToShow) {
    Object.values(sections).forEach((section) => {
      if (section) {
        // Check if section element exists
        section.style.display = "none";
      }
    });
    if (sectionToShow) {
      // Check if the section to show exists
      sectionToShow.style.display = "block";
    }
  }

  // --- Section Navigation Handling ---

  // 1. Consent Section
  acceptConsentBtn.addEventListener("click", () => {
    showSection(sections.demographics);
  });

  // 2. Socio-demographic Form Section
  // Conditional display for music genre question
  musicStudyRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value !== "Nunca") {
        musicGenreGroup.style.display = "block";
        document
          .getElementById("musicGenre")
          .setAttribute("required", "required");
      } else {
        musicGenreGroup.style.display = "none";
        document.getElementById("musicGenre").removeAttribute("required");
        document.getElementById("musicGenre").value = ""; // Clear selection
      }
    });
  });

  demographicsForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission

    // Collect data from the form based on index.html structure
    participantData = {
      participantId: participantId, // Use the generated ID
      gender:
        document.querySelector('input[name="gender"]:checked')?.value || null,
      age: document.getElementById("age").value || null,
      semester: document.getElementById("semester").value || null,
      drive:
        document.querySelector('input[name="drive"]:checked')?.value || null,
      sleep:
        document.querySelector('input[name="sleep"]:checked')?.value || null,
      musicStudy:
        document.querySelector('input[name="musicStudy"]:checked')?.value ||
        null,
      musicGenre:
        document.getElementById("musicGenre").value || "No escucha nada", // Default if "Nunca" was selected
      concentration:
        document.querySelector('input[name="concentration"]:checked')?.value ||
        null,
      screenTime:
        document.querySelector('input[name="screenTime"]:checked')?.value ||
        null,
      timestamp: new Date().toISOString(), // Add timestamp
    };

    // You'll need to re-evaluate the "juegaVideojuegos" part
    // as it wasn't in the provided HTML. If you add it, uncomment and adjust.
    // currentParticipantData.juegaVideojuegos = document.querySelector('input[name="videojuegos"]:checked').value;
    // --- Conditional display for music genre question ---
    musicStudyRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value !== "Nunca") {
          musicGenreGroup.style.display = "block";
          document
            .getElementById("musicGenre")
            .setAttribute("required", "required");
        } else {
          musicGenreGroup.style.display = "none";
          document.getElementById("musicGenre").removeAttribute("required");
          document.getElementById("musicGenre").value = ""; // Clear selection
        }
      });
    });

    console.log("Datos sociodemográficos capturados:", participantData);
    document.getElementById("container").style.display = "none";
    showSection(sections.jspsychDisplay);    
    startJsPsychExperiment(participantData,showSection);
  });

 
  // --- Initial Display ---
  //showSection(sections.consent); // Show the consent section first when the page loads

  // --- DEBUGGING CODE (Comment out or remove for production) ---
  // This part bypasses the consent and demographic sections for quick testing.
   document.getElementById("container").style.display = "none";
   participantData = {
        participantId: 'DEBUG_' + generateUniqueId(),
        gender: 'Hombre',
        age: '22',
        semester: '4',
        drive: 'Si',
        sleep: '7 a 8',
        musicStudy: 'A veces',
        musicGenre: 'Rock',
        concentration: 'Moderadamente',
        screenTime: '4 a 6',
        juegaVideojuegos: 'Sí', // Ensure this field exists in your HTML if used
        timestamp: new Date().toISOString()
    };
    showSection(sections.jspsychDisplay);
    startJsPsychExperiment(participantData,showSection);
    
});
