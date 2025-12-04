#!/usr/bin/env node
/**
 * Fill missing German and Spanish translations
 * This script adds translations for all empty msgstr entries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Translation mappings (English → German, English → Spanish)
const translations = {
  // common.actions.*
  "Save": { de: "Speichern", es: "Guardar" },
  "Save Changes": { de: "Änderungen speichern", es: "Guardar cambios" },
  "Save Contact": { de: "Kontakt speichern", es: "Guardar contacto" },
  "Cancel": { de: "Abbrechen", es: "Cancelar" },
  "Delete": { de: "Löschen", es: "Eliminar" },
  "Edit": { de: "Bearbeiten", es: "Editar" },
  "Add": { de: "Hinzufügen", es: "Agregar" },
  "Remove": { de: "Entfernen", es: "Quitar" },
  "Close": { de: "Schließen", es: "Cerrar" },
  "Confirm": { de: "Bestätigen", es: "Confirmar" },
  "Retry": { de: "Wiederholen", es: "Reintentar" },
  "Apply": { de: "Anwenden", es: "Aplicar" },
  "Clear": { de: "Löschen", es: "Limpiar" },
  "Reset": { de: "Zurücksetzen", es: "Restablecer" },
  "Update": { de: "Aktualisieren", es: "Actualizar" },
  "Run": { de: "Ausführen", es: "Ejecutar" },

  // common.states.*
  "Loading...": { de: "Wird geladen...", es: "Cargando..." },
  "Searching...": { de: "Suche läuft...", es: "Buscando..." },
  "Error": { de: "Fehler", es: "Error" },
  "Success": { de: "Erfolg", es: "Éxito" },
  "Warning": { de: "Warnung", es: "Advertencia" },
  "Info": { de: "Info", es: "Info" },
  "OK": { de: "OK", es: "OK" },

  // common.entities.*
  "Contact": { de: "Kontakt", es: "Contacto" },
  "Contacts": { de: "Kontakte", es: "Contactos" },
  "Interaction": { de: "Interaktion", es: "Interacción" },
  "Interactions": { de: "Interaktionen", es: "Interacciones" },
  "Event": { de: "Ereignis", es: "Evento" },
  "Events": { de: "Ereignisse", es: "Eventos" },
  "Company": { de: "Unternehmen", es: "Empresa" },
  "Companies": { de: "Unternehmen", es: "Empresas" },
  "Note": { de: "Notiz", es: "Nota" },
  "Notes": { de: "Notizen", es: "Notas" },
  "Category": { de: "Kategorie", es: "Categoría" },
  "Categories": { de: "Kategorien", es: "Categorías" },

  // common.time.*
  "Today": { de: "Heute", es: "Hoy" },
  "Tomorrow": { de: "Morgen", es: "Mañana" },
  "Yesterday": { de: "Gestern", es: "Ayer" },

  // common.dateRanges.*
  "All Time": { de: "Gesamte Zeit", es: "Todo el tiempo" },
  "Last 7 Days": { de: "Letzte 7 Tage", es: "Últimos 7 días" },
  "Last 30 Days": { de: "Letzte 30 Tage", es: "Últimos 30 días" },
  "Last 90 Days": { de: "Letzte 90 Tage", es: "Últimos 90 días" },

  // common.filters.*
  "All": { de: "Alle", es: "Todos" },
  "None": { de: "Keine", es: "Ninguno" },

  // common.errors.*
  "Something went wrong": { de: "Etwas ist schiefgelaufen", es: "Algo salió mal" },
  "Network error": { de: "Netzwerkfehler", es: "Error de red" },
  "Not found": { de: "Nicht gefunden", es: "No encontrado" },
  "Unauthorized": { de: "Nicht autorisiert", es: "No autorizado" },
  "Failed to save": { de: "Speichern fehlgeschlagen", es: "Error al guardar" },
  "Failed to delete": { de: "Löschen fehlgeschlagen", es: "Error al eliminar" },
  "Failed to load": { de: "Laden fehlgeschlagen", es: "Error al cargar" },

  // common.labels.*
  "Optional": { de: "Optional", es: "Opcional" },
  "Required": { de: "Erforderlich", es: "Obligatorio" },
  "Left": { de: "Links", es: "Izquierda" },
  "Right": { de: "Rechts", es: "Derecha" },

  // navigation.*
  "Proximity": { de: "Nähe", es: "Proximidad" },

  // settings.*
  "Proximity": { de: "Nähe", es: "Proximidad" },
  "Configure proximity scoring algorithm": { de: "Bewertungsalgorithmus für Nähe konfigurieren", es: "Configurar algoritmo de puntuación de proximidad" },
  "Proximity Algorithm": { de: "Nähe-Algorithmus", es: "Algoritmo de proximidad" },
  "Choose how relationship strength is calculated": { de: "Wählen Sie aus, wie die Beziehungsstärke berechnet wird", es: "Elija cómo se calcula la fuerza de la relación" },
  "Failed to toggle biometric authentication": { de: "Fehler beim Umschalten der biometrischen Authentifizierung", es: "Error al alternar autenticación biométrica" },
  "Failed to toggle auto-lock": { de: "Fehler beim Umschalten der automatischen Sperre", es: "Error al alternar bloqueo automático" },
  "Failed to change auto-lock timeout": { de: "Fehler beim Ändern des Auto-Sperr-Timeouts", es: "Error al cambiar el tiempo de bloqueo automático" },
  "Failed to change swipe action": { de: "Fehler beim Ändern der Wisch-Aktion", es: "Error al cambiar acción de deslizamiento" },
  "Failed to change theme": { de: "Fehler beim Ändern des Designs", es: "Error al cambiar el tema" },
  "Failed to change language": { de: "Fehler beim Ändern der Sprache", es: "Error al cambiar el idioma" },
  "Failed to toggle feature": { de: "Fehler beim Umschalten der Funktion", es: "Error al alternar función" },

  // theme.*
  "System Default": { de: "Systemstandard", es: "Predeterminado del sistema" },
  "Light": { de: "Hell", es: "Claro" },
  "Dark": { de: "Dunkel", es: "Oscuro" },

  // industries.*
  "Real Estate": { de: "Immobilien", es: "Bienes raíces" },

  // companies.*
  "Failed to create company": { de: "Fehler beim Erstellen des Unternehmens", es: "Error al crear empresa" },
  "Failed to update company": { de: "Fehler beim Aktualisieren des Unternehmens", es: "Error al actualizar empresa" },
  "Failed to delete company": { de: "Fehler beim Löschen des Unternehmens", es: "Error al eliminar empresa" },

  // interactions.filters.*
  "Video Calls": { de: "Videoanrufe", es: "Videollamadas" },
  "Social Media": { de: "Soziale Medien", es: "Redes sociales" },

  // interactionTypes.*
  "Call": { de: "Anruf", es: "Llamada" },
  "Text": { de: "Nachricht", es: "Mensaje" },
  "Email": { de: "E-Mail", es: "Correo" },
  "Meeting": { de: "Besprechung", es: "Reunión" },
  "Video Call": { de: "Videoanruf", es: "Videollamada" },
  "Social Media": { de: "Soziale Medien", es: "Redes sociales" },
  "Other": { de: "Sonstiges", es: "Otro" },

  // addInteraction.*
  "Video Call with {{name}}": { de: "Videoanruf mit {{name}}", es: "Videollamada con {{name}}" },

  // eventTypes.*
  "Birthday": { de: "Geburtstag", es: "Cumpleaños" },
  "Anniversary": { de: "Jubiläum", es: "Aniversario" },
  "Meeting": { de: "Besprechung", es: "Reunión" },
  "Deadline": { de: "Frist", es: "Plazo" },
  "Other": { de: "Sonstiges", es: "Otro" },

  // contactDetail.*
  "Info": { de: "Info", es: "Info" },
  "Activity": { de: "Aktivität", es: "Actividad" },
  "Upcoming Events": { de: "Bevorstehende Ereignisse", es: "Próximos eventos" },
  "Past Activity": { de: "Frühere Aktivität", es: "Actividad pasada" },
  "Add Interaction": { de: "Interaktion hinzufügen", es: "Agregar interacción" },
  "No recent activity": { de: "Keine aktuelle Aktivität", es: "Sin actividad reciente" },
  "Add your first interaction with this contact": { de: "Fügen Sie Ihre erste Interaktion mit diesem Kontakt hinzu", es: "Agrega tu primera interacción con este contacto" },
  "View {{count}} more": { de: "{{count}} weitere anzeigen", es: "Ver {{count}} más" },
  "View contact info": { de: "Kontaktinfo anzeigen", es: "Ver información de contacto" },

  // categories.*
  "Family": { de: "Familie", es: "Familia" },
  "Friends": { de: "Freunde", es: "Amigos" },
  "Work": { de: "Arbeit", es: "Trabajo" },
  "VIP": { de: "VIP", es: "VIP" },
  "Coworkers": { de: "Kollegen", es: "Compañeros" },
  "Clients": { de: "Kunden", es: "Clientes" },
  "Leads": { de: "Leads", es: "Prospectos" },
  "Vendors": { de: "Lieferanten", es: "Proveedores" },
  "Business": { de: "Geschäftlich", es: "Negocios" },
  "Personal": { de: "Persönlich", es: "Personal" },

  // addContact.*
  "Relationship Type": { de: "Beziehungstyp", es: "Tipo de relación" },

  // contact.phoneLabels.*
  "Mobile": { de: "Mobil", es: "Móvil" },
  "Home": { de: "Privat", es: "Casa" },
  "Work": { de: "Arbeit", es: "Trabajo" },
  "Other": { de: "Sonstiges", es: "Otro" },

  // contact.emailLabels.*
  "Personal": { de: "Persönlich", es: "Personal" },
  "Work": { de: "Arbeit", es: "Trabajo" },
  "Other": { de: "Sonstiges", es: "Otro" },

  // contact.contactTypes.*
  "Best Friend": { de: "Bester Freund", es: "Mejor amigo" },
  "Family": { de: "Familie", es: "Familia" },
  "Close Friend": { de: "Enger Freund", es: "Amigo cercano" },
  "Friend": { de: "Freund", es: "Amigo" },
  "Colleague": { de: "Kollege", es: "Colega" },
  "Acquaintance": { de: "Bekannter", es: "Conocido" },
  "Other": { de: "Sonstiges", es: "Otro" },

  // proximity.*
  "Relationship Proximity": { de: "Beziehungsnähe", es: "Proximidad de relación" },
  "Proximity Radar": { de: "Nähe-Radar", es: "Radar de proximidad" },
  "Calculating proximity scores...": { de: "Nähe-Werte werden berechnet...", es: "Calculando puntuaciones de proximidad..." },
  "Error Loading Proximity": { de: "Fehler beim Laden der Nähe", es: "Error al cargar proximidad" },
  "Failed to load proximity data. Please try again.": { de: "Fehler beim Laden der Nähe-Daten. Bitte versuchen Sie es erneut.", es: "Error al cargar datos de proximidad. Por favor, inténtalo de nuevo." },
  "No Proximity Data": { de: "Keine Nähe-Daten", es: "Sin datos de proximidad" },
  "Add some interactions to see relationship proximity scores.": { de: "Fügen Sie einige Interaktionen hinzu, um die Nähe-Werte zu sehen.", es: "Agrega algunas interacciones para ver las puntuaciones de proximidad." },
  "No Contacts": { de: "Keine Kontakte", es: "Sin contactos" },
  "Add contacts to start tracking relationship proximity.": { de: "Fügen Sie Kontakte hinzu, um die Beziehungsnähe zu verfolgen.", es: "Agrega contactos para comenzar a rastrear la proximidad de relaciones." },
  "About Proximity": { de: "Über Nähe", es: "Acerca de proximidad" },
  "Proximity scores (0-100) measure relationship strength based on:\n\n• Recency: When you last interacted\n• Frequency: How often you interact\n• Quality: Type and duration of interactions\n• Contact Type: Relationship classification\n\nHigher scores mean stronger, more active relationships.": { de: "Nähe-Werte (0-100) messen die Beziehungsstärke basierend auf:\n\n• Aktualität: Wann Sie zuletzt interagiert haben\n• Häufigkeit: Wie oft Sie interagieren\n• Qualität: Art und Dauer der Interaktionen\n• Kontakttyp: Beziehungsklassifizierung\n\nHöhere Werte bedeuten stärkere, aktivere Beziehungen.", es: "Las puntuaciones de proximidad (0-100) miden la fuerza de la relación basándose en:\n\n• Recencia: Cuándo interactuaste por última vez\n• Frecuencia: Con qué frecuencia interactúas\n• Calidad: Tipo y duración de las interacciones\n• Tipo de contacto: Clasificación de relación\n\nPuntuaciones más altas significan relaciones más fuertes y activas." },
  "The algorithm considers multiple factors to calculate how close you are to each contact.": { de: "Der Algorithmus berücksichtigt mehrere Faktoren, um zu berechnen, wie nah Sie jedem Kontakt sind.", es: "El algoritmo considera múltiples factores para calcular qué tan cerca estás de cada contacto." },
  "Understanding the Radar": { de: "Das Radar verstehen", es: "Entendiendo el radar" },
  "The proximity radar visualizes your relationship network:\n\n• Inner ring (80-100): Your closest relationships\n• Middle ring (40-79): Regular contacts\n• Outer ring (0-39): Distant connections\n\nTap any contact to view details.": { de: "Das Nähe-Radar visualisiert Ihr Beziehungsnetzwerk:\n\n• Innerer Ring (80-100): Ihre engsten Beziehungen\n• Mittlerer Ring (40-79): Regelmäßige Kontakte\n• Äußerer Ring (0-39): Entfernte Verbindungen\n\nTippen Sie auf einen Kontakt, um Details anzuzeigen.", es: "El radar de proximidad visualiza tu red de relaciones:\n\n• Anillo interno (80-100): Tus relaciones más cercanas\n• Anillo medio (40-79): Contactos regulares\n• Anillo externo (0-39): Conexiones distantes\n\nToca cualquier contacto para ver detalles." },
  "Got It": { de: "Verstanden", es: "Entendido" },

  // proximitySettings.*
  "Proximity Settings": { de: "Nähe-Einstellungen", es: "Configuración de proximidad" },
  "Scoring Algorithm": { de: "Bewertungsalgorithmus", es: "Algoritmo de puntuación" },
  "Choose how proximity is calculated": { de: "Wählen Sie, wie Nähe berechnet wird", es: "Elije cómo se calcula la proximidad" },
  "Preset": { de: "Voreinstellung", es: "Preajuste" },
  "Scoring Weights": { de: "Bewertungsgewichte", es: "Pesos de puntuación" },
  "Recency Weight": { de: "Aktualitätsgewicht", es: "Peso de recencia" },
  "Frequency Weight": { de: "Häufigkeitsgewicht", es: "Peso de frecuencia" },
  "Quality Weight": { de: "Qualitätsgewicht", es: "Peso de calidad" },
  "Contact Type Weight": { de: "Kontakttyp-Gewicht", es: "Peso de tipo de contacto" },
  "Custom algorithm not configured": { de: "Benutzerdefinierter Algorithmus nicht konfiguriert", es: "Algoritmo personalizado no configurado" },
  "Settings Saved": { de: "Einstellungen gespeichert", es: "Configuración guardada" },
  "Proximity settings updated successfully": { de: "Nähe-Einstellungen erfolgreich aktualisiert", es: "Configuración de proximidad actualizada exitosamente" },
  "Save Error": { de: "Speicherfehler", es: "Error al guardar" },
  "Failed to save proximity settings": { de: "Fehler beim Speichern der Nähe-Einstellungen", es: "Error al guardar configuración de proximidad" },
  "Load Error": { de: "Ladefehler", es: "Error al cargar" },
  "Failed to load proximity settings": { de: "Fehler beim Laden der Nähe-Einstellungen", es: "Error al cargar configuración de proximidad" },
};

// Plural form translations
const pluralTranslations = {
  "de": {
    "{{count}} contact": ["{{count}} Kontakt", "{{count}} Kontakte"],
    "{{count}} interaction": ["{{count}} Interaktion", "{{count}} Interaktionen"],
    "{{count}} event": ["{{count}} Ereignis", "{{count}} Ereignisse"],
    "{{count}} company": ["{{count}} Unternehmen", "{{count}} Unternehmen"],
    "{{count}} category": ["{{count}} Kategorie", "{{count}} Kategorien"],
    "{{count}} note": ["{{count}} Notiz", "{{count}} Notizen"],
    "{{count}} result": ["{{count}} Ergebnis", "{{count}} Ergebnisse"],
    "{{count}} item": ["{{count}} Element", "{{count}} Elemente"],
    "{{count}} unique contact": ["{{count}} eindeutiger Kontakt", "{{count}} eindeutige Kontakte"],
    "{{count}} minute": ["{{count}} Minute", "{{count}} Minuten"],
    "{{count}} hour": ["{{count}} Stunde", "{{count}} Stunden"],
    "{{count}} day": ["{{count}} Tag", "{{count}} Tage"],
    "{{count}} week": ["{{count}} Woche", "{{count}} Wochen"],
    "{{count}} day ago": ["vor {{count}} Tag", "vor {{count}} Tagen"],
    "{{count}} minute ago": ["vor {{count}} Minute", "vor {{count}} Minuten"],
    "{{count}} hour ago": ["vor {{count}} Stunde", "vor {{count}} Stunden"],
    "View {{count}} more": ["{{count}} weitere anzeigen", "{{count}} weitere anzeigen"],
  },
  "es": {
    "{{count}} contact": ["{{count}} contacto", "{{count}} contactos"],
    "{{count}} interaction": ["{{count}} interacción", "{{count}} interacciones"],
    "{{count}} event": ["{{count}} evento", "{{count}} eventos"],
    "{{count}} company": ["{{count}} empresa", "{{count}} empresas"],
    "{{count}} category": ["{{count}} categoría", "{{count}} categorías"],
    "{{count}} note": ["{{count}} nota", "{{count}} notas"],
    "{{count}} result": ["{{count}} resultado", "{{count}} resultados"],
    "{{count}} item": ["{{count}} elemento", "{{count}} elementos"],
    "{{count}} unique contact": ["{{count}} contacto único", "{{count}} contactos únicos"],
    "{{count}} minute": ["{{count}} minuto", "{{count}} minutos"],
    "{{count}} hour": ["{{count}} hora", "{{count}} horas"],
    "{{count}} day": ["{{count}} día", "{{count}} días"],
    "{{count}} week": ["{{count}} semana", "{{count}} semanas"],
    "{{count}} day ago": ["hace {{count}} día", "hace {{count}} días"],
    "{{count}} minute ago": ["hace {{count}} minuto", "hace {{count}} minutos"],
    "{{count}} hour ago": ["hace {{count}} hora", "hace {{count}} horas"],
    "View {{count}} more": ["Ver {{count}} más", "Ver {{count}} más"],
  }
};

function fillTranslations(filePath, lang) {
  console.log(`\nProcessing ${lang.toUpperCase()} file: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fillCount = 0;

  // Process line by line
  const lines = content.split('\n');
  const result = [];
  let currentMsgid = null;
  let isPlural = false;
  let pluralIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect msgid
    if (line.startsWith('msgid "')) {
      currentMsgid = line.match(/msgid "(.*)"/)?.[1];
      isPlural = false;
      pluralIndex = -1;
      result.push(line);
      continue;
    }

    // Detect msgid_plural
    if (line.startsWith('msgid_plural ')) {
      isPlural = true;
      result.push(line);
      continue;
    }

    // Process msgstr
    if (line.match(/^msgstr(\[\d+\])? ""/)) {
      const pluralMatch = line.match(/^msgstr\[(\d+)\]/);
      if (pluralMatch) {
        pluralIndex = parseInt(pluralMatch[1]);
      }

      if (currentMsgid) {
        let translation = null;

        // Handle plural forms
        if (isPlural && pluralIndex >= 0 && pluralTranslations[lang]) {
          const pluralKey = currentMsgid;
          if (pluralTranslations[lang][pluralKey]) {
            translation = pluralTranslations[lang][pluralKey][pluralIndex];
          }
        }
        // Handle regular translations
        else if (!isPlural && translations[currentMsgid]) {
          translation = translations[currentMsgid][lang];
        }

        if (translation) {
          const indent = line.match(/^(msgstr(\[\d+\])?)\s*/)?.[0] || 'msgstr ';
          result.push(`${indent}"${translation}"`);
          fillCount++;
          modified = true;
          continue;
        }
      }
    }

    result.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    console.log(`✅ Filled ${fillCount} translations in ${lang.toUpperCase()}`);
  } else {
    console.log(`ℹ️  No empty translations found in ${lang.toUpperCase()}`);
  }

  return fillCount;
}

// Main execution
const localesDir = path.join(__dirname, '..', 'locales');
const deFile = path.join(localesDir, 'de.po');
const esFile = path.join(localesDir, 'es.po');

console.log('='.repeat(60));
console.log('Filling missing German and Spanish translations');
console.log('='.repeat(60));

const deFilled = fillTranslations(deFile, 'de');
const esFilled = fillTranslations(esFile, 'es');

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`German (de.po):  ${deFilled} translations filled`);
console.log(`Spanish (es.po): ${esFilled} translations filled`);
console.log('\n✅ Translation filling complete!\n');
