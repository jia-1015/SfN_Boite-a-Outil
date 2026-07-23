const state = {
  step: 1,
  sfnId: "",
  environment: "",
  dimensionAnswer: "",
  contextAnswers: {},
  additionalImpactIds: [],
  selectedImpactIds: [],
  activeProtocolImpactId: null,
  protocolResults: {},
  directSummary: {
    implementationCosts: "",
    qualitativeEffects: "",
    justification: "",
    uncertainties: ""
  }
};

let sfnData = [];
let impactData = { impacts: [], scores: [] };
let dimensionData = null;
let contextData = null;
let protocolData = null;

async function loadData() {
  const [sfnResponse, impactsResponse, dimensionResponse, contextResponse, protocolResponse] = await Promise.all([
    fetch("data/sfn.json"),
    fetch("data/impacts.json"),
    fetch("data/dimension.json"),
    fetch("data/context-questions.json"),
    fetch("data/protocols.json")
  ]);

  if (![sfnResponse, impactsResponse, dimensionResponse, contextResponse, protocolResponse].every(r => r.ok)) {
    throw new Error("Impossible de charger les données de l’outil.");
  }

  sfnData = await sfnResponse.json();
  impactData = await impactsResponse.json();
  dimensionData = await dimensionResponse.json();
  contextData = await contextResponse.json();
  protocolData = await protocolResponse.json();
  render();
}

function selectedSfn() {
  return sfnData.find(item => item.id === state.sfnId);
}

function selectedScore() {
  return impactData.scores.find(
    item => item.sfnId === state.sfnId && item.environment === state.environment
  );
}

function potentialImpacts() {
  const score = selectedScore();
  if (!score) return [];
  return impactData.impacts.filter(
    impact => Number(score.levels[String(impact.id)]) > 0
  );
}

function renderProgress() {
  const progress = document.getElementById("progress");
  progress.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const step = index + 1;
    let className = "progress-item";
    if (step === state.step) className += " active";
    if (step < state.step) className += " completed";
    return `<div class="${className}">Étape ${step}</div>`;
  }).join("");
}

function render() {
  renderProgress();
  if (state.step === 1) renderStep1();
  else if (state.step === 2) renderStep2();
  else if (state.step === 3) renderStep3();
  else if (state.step === 4) renderStep4();
  else if (state.step === 5) renderStep5();
  else renderStep6();
}

function goToStep(step) {
  state.step = step;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStep1() {
  const app = document.getElementById("app");
  const sfn = selectedSfn();

  app.innerHTML = `
    <div class="step-kicker">Étape 1 sur 6</div>
    <h2>Sélectionner la Solution fondée sur la Nature</h2>
    <p class="lead">
      Choisissez la catégorie correspondant aux actions et mesures de votre projet.
      Sa définition et les exemples de mesures apparaîtront automatiquement.
    </p>
    <div class="field">
      <label for="sfn-select">Type de SfN</label>
      <select id="sfn-select">
        <option value="">Sélectionnez une SfN…</option>
        ${sfnData.map(item => `
          <option value="${item.id}" ${item.id === state.sfnId ? "selected" : ""}>
            ${item.name}
          </option>`).join("")}
      </select>
      <div id="validation-step1" class="validation">Veuillez sélectionner une SfN avant de continuer.</div>
    </div>
    ${sfn ? `
      <div class="info-panel">
        <h3>Définition générale</h3>
        <p>${sfn.definition}</p>
        <h3>Mesures et actions associées</h3>
        <ul class="measure-list">${sfn.measures.map(m => `<li>${m}</li>`).join("")}</ul>
      </div>` : ""}
    <div class="actions"><button class="primary" id="next-step">Étape suivante →</button></div>
  `;

  document.getElementById("sfn-select").addEventListener("change", event => {
    state.sfnId = event.target.value;
    state.environment = "";
    state.dimensionAnswer = "";
    state.contextAnswers = {};
    state.additionalImpactIds = [];
    state.selectedImpactIds = [];
    state.protocolResults = {};
    state.activeProtocolImpactId = null;
    state.directSummary = {
      implementationCosts: "",
      qualitativeEffects: "",
      justification: "",
      uncertainties: ""
    };
    render();
  });
  document.getElementById("next-step").addEventListener("click", () => {
    if (!state.sfnId) {
      document.getElementById("validation-step1").style.display = "block";
      return;
    }
    goToStep(2);
  });
}

function renderStep2() {
  const app = document.getElementById("app");
  const sfn = selectedSfn();
  const score = selectedScore();
  if (!sfn) return goToStep(1);

  const primary = score ? impactData.impacts.filter(i => score.levels[String(i.id)] === 2) : [];
  const secondary = score ? impactData.impacts.filter(i => score.levels[String(i.id)] === 1) : [];
  const items = (list, cls) => list.map(i => `
    <div class="impact-item ${cls}">
      <div class="impact-name">${i.name}</div>
      <div class="impact-description">${i.description}</div>
    </div>`).join("");

  app.innerHTML = `
    <div class="step-kicker">Étape 2 sur 6</div>
    <h2>Choisir le milieu de mise en œuvre</h2>
    <p class="lead">Le milieu permet d’affiner les impacts socio-économiques susceptibles de se rapporter à votre projet.</p>
    <div class="summary"><div><strong>SfN sélectionnée :</strong> ${sfn.name}</div></div>
    <div class="field">
      <label for="environment-select">Milieu concerné</label>
      <select id="environment-select">
        <option value="">Sélectionnez un milieu…</option>
        ${sfn.environments.map(e => `<option value="${e}" ${e === state.environment ? "selected" : ""}>${e}</option>`).join("")}
      </select>
      <div id="validation-step2" class="validation">Veuillez sélectionner un milieu avant de continuer.</div>
    </div>
    ${score ? `
      <div class="impact-columns">
        <section class="impact-panel primary"><h3>Impacts principaux</h3><p class="panel-note">Éléments prioritaires.</p>${items(primary, "primary")}</section>
        <section class="impact-panel secondary"><h3>Impacts secondaires</h3><p class="panel-note">Éléments complémentaires.</p>${items(secondary, "secondary")}</section>
      </div>` : `<div class="placeholder">Choisissez un milieu pour afficher les impacts potentiels associés.</div>`}
    <div class="actions">
      <button class="secondary" id="previous-step">← Étape précédente</button>
      <button class="primary" id="next-step">Étape suivante →</button>
    </div>
  `;

  document.getElementById("environment-select").addEventListener("change", event => {
    state.environment = event.target.value;
    state.dimensionAnswer = "";
    state.contextAnswers = {};
    state.additionalImpactIds = [];
    state.selectedImpactIds = [];
    state.protocolResults = {};
    state.activeProtocolImpactId = null;
    render();
  });
  document.getElementById("previous-step").addEventListener("click", () => goToStep(1));
  document.getElementById("next-step").addEventListener("click", () => {
    if (!state.environment) {
      document.getElementById("validation-step2").style.display = "block";
      return;
    }
    goToStep(3);
  });
}

function renderStep3() {
  const app = document.getElementById("app");
  const sfn = selectedSfn();
  if (!sfn || !state.environment) return goToStep(2);

  app.innerHTML = `
    <div class="step-kicker">Étape 3 sur 6</div>
    <h2>${dimensionData.title}</h2>
    <p class="lead">Cette étape permet de vérifier si le projet justifie une analyse détaillée et systématique.</p>
    <div class="summary"><div><strong>SfN :</strong> ${sfn.name}</div><div><strong>Milieu :</strong> ${state.environment}</div></div>
    <details class="help-box" open><summary>Pourquoi cette question ?</summary><p>${dimensionData.userNote}</p></details>
    <section class="question-card">
      <div class="question-label">Question de dimensionnement</div>
      <h3>${dimensionData.question}</h3>
      <div class="choice-grid">
        ${["yes", "no"].map(value => `
          <label class="choice-card ${state.dimensionAnswer === value ? "selected" : ""}">
            <input type="radio" name="dimension" value="${value}" ${state.dimensionAnswer === value ? "checked" : ""}>
            <span class="choice-title">${dimensionData.answers[value].label}</span>
            <span class="choice-help">${dimensionData.answers[value].help}</span>
          </label>`).join("")}
      </div>
      <div id="validation-step3" class="validation">Veuillez choisir « Oui » ou « Non » avant de continuer.</div>
    </section>
    ${state.dimensionAnswer ? `<div class="routing-message ${state.dimensionAnswer}">
      ${state.dimensionAnswer === "yes"
        ? "Votre projet poursuivra vers l’étape 4 afin de contextualiser les impacts potentiels."
        : "Votre projet passera directement à l’étape 6 pour une présentation proportionnée des résultats."}
    </div>` : ""}
    <div class="actions">
      <button class="secondary" id="previous-step">← Étape précédente</button>
      <button class="primary" id="next-step">Continuer →</button>
    </div>
  `;

  document.querySelectorAll('input[name="dimension"]').forEach(input => {
    input.addEventListener("change", event => {
      state.dimensionAnswer = event.target.value;
      if (event.target.value === "no") {
        state.contextAnswers = {};
        state.additionalImpactIds = [];
        state.selectedImpactIds = [];
      }
      render();
    });
  });
  document.getElementById("previous-step").addEventListener("click", () => goToStep(2));
  document.getElementById("next-step").addEventListener("click", () => {
    if (!state.dimensionAnswer) {
      document.getElementById("validation-step3").style.display = "block";
      return;
    }
    goToStep(dimensionData.answers[state.dimensionAnswer].nextStep);
  });
}

function answerButtons(impactId, type) {
  const current = state.contextAnswers[String(impactId)]?.[type] || "";
  return `
    <div class="binary-buttons" data-impact="${impactId}" data-type="${type}">
      <button type="button" class="binary ${current === "yes" ? "selected yes" : ""}" data-value="yes">Oui</button>
      <button type="button" class="binary ${current === "no" ? "selected no" : ""}" data-value="no">Non</button>
    </div>`;
}

function computeSelectedImpacts() {
  const potential = potentialImpacts();
  const selected = [];

  potential.forEach(impact => {
    const questions = contextData.questions[String(impact.id)];
    if (!questions) {
      selected.push(impact.id);
      return;
    }
    const answers = state.contextAnswers[String(impact.id)] || {};
    if (answers.territory === "yes" || answers.accompaniment === "yes") {
      selected.push(impact.id);
    }
  });

  state.additionalImpactIds.forEach(id => {
    if (!selected.includes(id)) selected.push(id);
  });
  return selected;
}

function contextIsComplete() {
  return potentialImpacts().every(impact => {
    const questions = contextData.questions[String(impact.id)];
    if (!questions) return true;
    const answers = state.contextAnswers[String(impact.id)] || {};
    if (!answers.territory) return false;
    if (questions.accompaniment && !answers.accompaniment) return false;
    return true;
  });
}

function renderStep4() {
  const app = document.getElementById("app");
  if (state.dimensionAnswer !== "yes") return goToStep(3);

  const potential = potentialImpacts();
  const potentialIds = potential.map(i => i.id);
  const otherImpacts = impactData.impacts.filter(i => !potentialIds.includes(i.id));
  const selectedNow = computeSelectedImpacts();

  app.innerHTML = `
    <div class="step-kicker">Étape 4 sur 6</div>
    <h2>${contextData.title}</h2>
    <p class="lead">${contextData.userNote}</p>

    <div class="summary">
      <div><strong>SfN :</strong> ${selectedSfn().name}</div>
      <div><strong>Milieu :</strong> ${state.environment}</div>
      <div><strong>Impacts potentiels :</strong> ${potential.length}</div>
    </div>

    <div class="context-list">
      ${potential.map((impact, index) => {
        const questions = contextData.questions[String(impact.id)];
        return `
          <article class="context-impact">
            <div class="context-impact-header">
              <span class="impact-index">${index + 1}</span>
              <div>
                <h3>${impact.name}</h3>
                <p>${impact.description}</p>
              </div>
              <span class="status-pill ${selectedNow.includes(impact.id) ? "kept" : "pending"}">
                ${questions
                  ? (selectedNow.includes(impact.id) ? "Retenu" : "À confirmer")
                  : "Retenu automatiquement"}
              </span>
            </div>
            ${questions ? `
              <div class="context-question">
                <div>
                  <span class="question-type">Caractéristiques du territoire</span>
                  <p>${questions.territory}</p>
                </div>
                ${answerButtons(impact.id, "territory")}
              </div>
              ${questions.accompaniment ? `
                <div class="context-question">
                  <div>
                    <span class="question-type">Mesures d’accompagnement</span>
                    <p>${questions.accompaniment}</p>
                  </div>
                  ${answerButtons(impact.id, "accompaniment")}
                </div>` : ""}
            ` : `
              <div class="auto-note">
                Cet impact ne nécessite pas de question de contextualisation supplémentaire et sera repris automatiquement à l’étape 5.
              </div>`}
          </article>`;
      }).join("")}
    </div>

    <details class="additional-box">
      <summary>Ajouter un impact non présélectionné</summary>
      <p>${contextData.additionalNote}</p>
      ${otherImpacts.length ? `
        <div class="checkbox-list">
          ${otherImpacts.map(impact => `
            <label class="checkbox-impact">
              <input type="checkbox" value="${impact.id}" ${state.additionalImpactIds.includes(impact.id) ? "checked" : ""}>
              <span><strong>${impact.name}</strong><small>${impact.description}</small></span>
            </label>`).join("")}
        </div>` : `<p>Tous les impacts sont déjà présélectionnés pour cette combinaison.</p>`}
    </details>

    <div class="selection-summary">
      <strong>${selectedNow.length} impact(s) actuellement retenu(s)</strong>
      <span>La liste sera transmise à l’étape 5.</span>
    </div>

    <div id="validation-step4" class="validation">
      Veuillez répondre à toutes les questions de contextualisation avant de continuer.
    </div>

    <div class="actions">
      <button class="secondary" id="previous-step">← Étape précédente</button>
      <button class="primary" id="next-step">Valider les impacts →</button>
    </div>
  `;

  document.querySelectorAll(".binary-buttons .binary").forEach(button => {
    button.addEventListener("click", event => {
      const group = event.target.closest(".binary-buttons");
      const impactId = group.dataset.impact;
      const type = group.dataset.type;
      state.contextAnswers[impactId] ||= {};
      state.contextAnswers[impactId][type] = event.target.dataset.value;
      render();
    });
  });

  document.querySelectorAll(".checkbox-impact input").forEach(input => {
    input.addEventListener("change", event => {
      const id = Number(event.target.value);
      if (event.target.checked) {
        if (!state.additionalImpactIds.includes(id)) state.additionalImpactIds.push(id);
      } else {
        state.additionalImpactIds = state.additionalImpactIds.filter(item => item !== id);
      }
      render();
    });
  });

  document.getElementById("previous-step").addEventListener("click", () => goToStep(3));
  document.getElementById("next-step").addEventListener("click", () => {
    if (!contextIsComplete()) {
      document.getElementById("validation-step4").style.display = "block";
      return;
    }
    state.selectedImpactIds = computeSelectedImpacts();
    goToStep(5);
  });
}

function ensureProtocolResult(impactId) {
  const key = String(impactId);
  state.protocolResults[key] ||= {
    variantIndex: 0,
    levelId: null,
    qualitative: "",
    quantitative: "",
    monetary: "",
    uncertainty: "",
    importance: ""
  };
  return state.protocolResults[key];
}

function renderMethodItems(level) {
  if (!level || !level.items.length) return `<p class="placeholder">Aucun contenu méthodologique détaillé n’est renseigné pour ce niveau.</p>`;
  return level.items.map((item, index) => `
    <article class="method-row">
      <div class="method-number">${index + 1}</div>
      <div class="method-cell"><span>Étapes à suivre</span><p>${item.steps || "—"}</p></div>
      <div class="method-cell"><span>Données à mobiliser</span><p>${item.data || "—"}</p></div>
      <div class="method-cell"><span>Résultats attendus</span><p>${item.results || "—"}</p></div>
      <div class="method-cell vigilance"><span>Point de vigilance</span><p>${item.vigilance || "—"}</p></div>
    </article>`).join("");
}

function renderStep5() {
  const app = document.getElementById("app");
  if (!state.selectedImpactIds.length) {
    state.selectedImpactIds = computeSelectedImpacts();
  }
  if (!state.selectedImpactIds.length) return goToStep(4);
  if (!state.activeProtocolImpactId || !state.selectedImpactIds.includes(state.activeProtocolImpactId)) {
    state.activeProtocolImpactId = state.selectedImpactIds[0];
  }

  const impactId = state.activeProtocolImpactId;
  const impact = impactData.impacts.find(i => i.id === impactId);
  const protocol = protocolData.protocols[String(impactId)];
  const result = ensureProtocolResult(impactId);
  const variant = protocol?.variants[result.variantIndex] || protocol?.variants[0];
  const selectedLevel = variant?.levels.find(level => level.id === Number(result.levelId));

  app.innerHTML = `
    <div class="step-kicker">Étape 5 sur 6</div>
    <h2>Appliquer les méthodes d’évaluation</h2>
    <p class="lead">Choisissez un impact, consultez les méthodes proposées dans l’Excel, puis synthétisez vos résultats. Vous pouvez commencer par le niveau le plus simple et approfondir selon vos données et ressources.</p>

    <div class="protocol-layout">
      <aside class="protocol-nav">
        <h3>Impacts à évaluer</h3>
        ${state.selectedImpactIds.map((id,index) => {
          const item=impactData.impacts.find(i=>i.id===id);
          const saved=ensureProtocolResult(id);
          return `<button class="protocol-nav-item ${id===impactId ? "active" : ""}" data-id="${id}">
            <span>${index+1}</span><strong>${item.name}</strong>
            <small>${saved.levelId !== null ? `Niveau ${saved.levelId} choisi` : "Méthode à choisir"}</small>
          </button>`;
        }).join("")}
      </aside>

      <div class="protocol-main">
        <section class="protocol-heading">
          <span class="protocol-tag">Impact ${state.selectedImpactIds.indexOf(impactId)+1} sur ${state.selectedImpactIds.length}</span>
          <h3>${impact.name}</h3>
          <p>${variant?.impactSummary || impact.description}</p>
        </section>

        ${protocol?.variants.length > 1 ? `
          <div class="field compact-field">
            <label for="variant-select">Protocole proposé</label>
            <select id="variant-select">
              ${protocol.variants.map((v,i)=>`<option value="${i}" ${i===result.variantIndex ? "selected" : ""}>${v.title || `Approche ${i+1}`}</option>`).join("")}
            </select>
          </div>` : ""}

        ${variant?.beforeStarting ? `<details class="help-box"><summary>Avant de vous lancer</summary><p>${variant.beforeStarting}</p></details>` : ""}

        <section class="level-picker">
          <h4>Choisissez le niveau méthodologique</h4>
          <div class="level-options">
            ${variant?.levels.map(level => `
              <label class="level-option ${Number(result.levelId)===level.id ? "selected" : ""}">
                <input type="radio" name="method-level" value="${level.id}" ${Number(result.levelId)===level.id ? "checked" : ""}>
                <strong>${level.label}</strong><span>${level.complexity}</span>
              </label>`).join("") || `<p>Aucun niveau renseigné.</p>`}
          </div>
        </section>

        ${selectedLevel ? `
          <section class="method-section">
            <h4>${selectedLevel.label} — méthode proposée</h4>
            ${renderMethodItems(selectedLevel)}
          </section>` : `<div class="placeholder">Sélectionnez un niveau pour afficher les étapes, données, résultats attendus et points de vigilance.</div>`}

        ${variant?.references?.length ? `<details class="reference-box"><summary>Références et ressources</summary><ul>${variant.references.map(ref=>`<li><a href="${ref.url}" target="_blank" rel="noopener">${ref.label}</a></li>`).join("")}</ul></details>` : ""}

        <section class="result-form">
          <h4>Synthétiser vos résultats</h4>
          <div class="form-grid">
            <label>Résultat qualitatif<textarea data-field="qualitative" placeholder="Décrivez les principaux effets observés ou attendus…">${result.qualitative}</textarea></label>
            <label>Résultat quantitatif<textarea data-field="quantitative" placeholder="Indicateurs, volumes, surfaces, personnes concernées…">${result.quantitative}</textarea></label>
            <label>Résultat monétaire<textarea data-field="monetary" placeholder="Montants en euros, coûts évités, valeur estimée…">${result.monetary}</textarea></label>
            <label>Incertitudes et commentaires<textarea data-field="uncertainty" placeholder="Hypothèses, limites des données et précautions d’interprétation…">${result.uncertainty}</textarea></label>
          </div>
          <div class="field importance-field">
            <label for="importance-select">Importance relative de cet impact pour le territoire</label>
            <select id="importance-select">
              <option value="">À préciser…</option>
              ${["Faible","Modérée","Forte"].map(v=>`<option value="${v}" ${result.importance===v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </div>
        </section>
      </div>
    </div>

    <div class="actions">
      <button class="secondary" id="previous-step">← Étape précédente</button>
      <button class="primary" id="next-step">Analyser les résultats →</button>
    </div>`;

  document.querySelectorAll('.protocol-nav-item').forEach(button => button.addEventListener('click',()=>{
    state.activeProtocolImpactId=Number(button.dataset.id); render(); window.scrollTo({top:0,behavior:'smooth'});
  }));
  document.querySelectorAll('input[name="method-level"]').forEach(input => input.addEventListener('change',()=>{
    result.levelId=Number(input.value); render();
  }));
  const variantSelect=document.getElementById('variant-select');
  if (variantSelect) variantSelect.addEventListener('change',()=>{result.variantIndex=Number(variantSelect.value); result.levelId=null; render();});
  document.querySelectorAll('.result-form textarea').forEach(area => area.addEventListener('input',()=>{result[area.dataset.field]=area.value;}));
  document.getElementById('importance-select').addEventListener('change',e=>{result.importance=e.target.value;});
  document.getElementById('previous-step').addEventListener('click',()=>goToStep(4));
  document.getElementById('next-step').addEventListener('click',()=>goToStep(6));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function impactCategory(impactId) {
  if (impactId === 1) return "cost";
  if ([2, 3, 4].includes(impactId)) return "negative";
  return "benefit";
}

function categoryLabel(category) {
  return {
    cost: "Coûts",
    negative: "Impacts négatifs",
    benefit: "Bénéfices"
  }[category];
}

function importanceScore(value) {
  return { "Faible": 1, "Modérée": 2, "Forte": 3 }[value] || 0;
}

function renderResultValue(value, emptyText = "Non renseigné") {
  return value && value.trim()
    ? `<span class="result-value">${escapeHtml(value)}</span>`
    : `<span class="result-empty">${emptyText}</span>`;
}

function renderSummaryTable(rows) {
  if (!rows.length) {
    return `<div class="empty-category">Aucun impact retenu dans cette catégorie.</div>`;
  }

  return `
    <div class="summary-table-wrap">
      <table class="summary-table">
        <thead>
          <tr>
            <th>Impact</th>
            <th>Niveau</th>
            <th>Qualitatif</th>
            <th>Quantitatif</th>
            <th>Monétaire</th>
            <th>Importance</th>
            <th>Incertitudes</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td><strong>${escapeHtml(row.impact.name)}</strong></td>
              <td>${row.levelLabel ? escapeHtml(row.levelLabel) : '<span class="result-empty">Non choisi</span>'}</td>
              <td>${renderResultValue(row.result.qualitative)}</td>
              <td>${renderResultValue(row.result.quantitative)}</td>
              <td>${renderResultValue(row.result.monetary)}</td>
              <td>
                ${row.result.importance
                  ? `<span class="importance-badge importance-${importanceScore(row.result.importance)}">${escapeHtml(row.result.importance)}</span>`
                  : '<span class="result-empty">Non précisée</span>'}
              </td>
              <td>${renderResultValue(row.result.uncertainties)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderImportanceChart(rows) {
  const chartRows = rows.filter(row => importanceScore(row.result.importance) > 0);
  if (!chartRows.length) {
    return `<div class="placeholder">Précisez l’importance relative des impacts à l’étape 5 pour générer cette représentation.</div>`;
  }

  return `
    <div class="importance-chart">
      ${chartRows.map(row => {
        const score = importanceScore(row.result.importance);
        return `
          <div class="chart-row">
            <div class="chart-label">${escapeHtml(row.impact.name)}</div>
            <div class="chart-track" aria-label="${escapeHtml(row.result.importance)}">
              <div class="chart-bar score-${score}" style="width:${score * 33.333}%"></div>
            </div>
            <div class="chart-value">${escapeHtml(row.result.importance)}</div>
          </div>`;
      }).join("")}
    </div>`;
}

function renderDirectStep6(app) {
  const direct = state.directSummary;

  app.innerHTML = `
    <div class="step-kicker">Étape 6 sur 6</div>
    <h2>Présenter une analyse proportionnée</h2>
    <p class="lead">
      Les impacts du projet ont été jugés peu perceptibles ou peu mesurables.
      Une évaluation détaillée n’est donc pas nécessaire, mais les coûts, effets attendus
      et limites de l’analyse doivent rester explicitement présentés.
    </p>

    <div class="summary report-identity">
      <div><strong>SfN :</strong> ${escapeHtml(selectedSfn()?.name || "Non renseignée")}</div>
      <div><strong>Milieu :</strong> ${escapeHtml(state.environment || "Non renseigné")}</div>
      <div><strong>Approche :</strong> Analyse qualitative proportionnée</div>
    </div>

    <section class="direct-report-form">
      <div class="field">
        <label for="direct-costs">Coûts de mise en œuvre</label>
        <textarea id="direct-costs" rows="4" placeholder="Décrivez les principaux coûts d’investissement, de gestion et de maintenance…">${escapeHtml(direct.implementationCosts)}</textarea>
      </div>

      <div class="field">
        <label for="direct-effects">Effets socio-économiques attendus</label>
        <textarea id="direct-effects" rows="5" placeholder="Présentez qualitativement les principaux effets positifs et négatifs attendus…">${escapeHtml(direct.qualitativeEffects)}</textarea>
      </div>

      <div class="field">
        <label for="direct-justification">Justification de l’analyse proportionnée</label>
        <textarea id="direct-justification" rows="4" placeholder="Expliquez pourquoi les impacts sont considérés comme limités ou difficilement mesurables…">${escapeHtml(direct.justification)}</textarea>
      </div>

      <div class="field">
        <label for="direct-uncertainties">Incertitudes et points de vigilance</label>
        <textarea id="direct-uncertainties" rows="4" placeholder="Indiquez les limites, hypothèses et informations à suivre…">${escapeHtml(direct.uncertainties)}</textarea>
      </div>
    </section>

    <section class="final-preview">
      <div class="section-heading">
        <div>
          <span class="section-number">Synthèse</span>
          <h3>Aperçu du rapport</h3>
        </div>
      </div>
      <div class="direct-preview-grid">
        <article><h4>Coûts</h4><p>${renderResultValue(direct.implementationCosts)}</p></article>
        <article><h4>Effets attendus</h4><p>${renderResultValue(direct.qualitativeEffects)}</p></article>
        <article><h4>Justification</h4><p>${renderResultValue(direct.justification)}</p></article>
        <article><h4>Incertitudes</h4><p>${renderResultValue(direct.uncertainties)}</p></article>
      </div>
    </section>

    <div class="actions report-actions">
      <button class="secondary" id="previous-step">← Revenir à l’étape 3</button>
      <button class="secondary" id="print-report">Imprimer / enregistrer en PDF</button>
    </div>`;

  [
    ["direct-costs", "implementationCosts"],
    ["direct-effects", "qualitativeEffects"],
    ["direct-justification", "justification"],
    ["direct-uncertainties", "uncertainties"]
  ].forEach(([id, field]) => {
    document.getElementById(id).addEventListener("input", event => {
      direct[field] = event.target.value;
    });
    document.getElementById(id).addEventListener("change", render);
  });

  document.getElementById("previous-step").addEventListener("click", () => goToStep(3));
  document.getElementById("print-report").addEventListener("click", () => window.print());
}

function renderStep6() {
  const app = document.getElementById("app");
  const direct = state.dimensionAnswer === "no";

  if (direct) {
    renderDirectStep6(app);
    return;
  }

  const rows = state.selectedImpactIds.map(id => {
    const impact = impactData.impacts.find(item => item.id === id);
    const protocol = protocolData.protocols[String(id)];
    const result = state.protocolResults[String(id)] || {
      levelId: null,
      variantIndex: 0,
      qualitative: "",
      quantitative: "",
      monetary: "",
      uncertainties: "",
      importance: ""
    };

    const variant = protocol?.variants?.[result.variantIndex || 0];
    const level = variant?.levels?.find(item => Number(item.level) === Number(result.levelId));

    return {
      impact,
      result,
      category: impactCategory(id),
      levelLabel: level ? `Niveau ${level.level}` : ""
    };
  }).filter(row => row.impact);

  const completed = rows.filter(row =>
    row.result.qualitative ||
    row.result.quantitative ||
    row.result.monetary ||
    row.result.importance ||
    row.result.uncertainties
  ).length;

  const categories = {
    cost: rows.filter(row => row.category === "cost"),
    negative: rows.filter(row => row.category === "negative"),
    benefit: rows.filter(row => row.category === "benefit")
  };

  const monetaryCount = rows.filter(row => row.result.monetary?.trim()).length;
  const quantitativeCount = rows.filter(row => row.result.quantitative?.trim()).length;
  const strongCount = rows.filter(row => row.result.importance === "Forte").length;

  app.innerHTML = `
    <div class="step-kicker">Étape 6 sur 6</div>
    <h2>Analyser et présenter les résultats</h2>
    <p class="lead">
      Cette synthèse rassemble les résultats renseignés à l’étape 5. Elle distingue les coûts,
      les impacts négatifs et les bénéfices, tout en conservant les incertitudes et le niveau
      d’importance attribué à chaque impact.
    </p>

    <div class="summary report-identity">
      <div><strong>SfN :</strong> ${escapeHtml(selectedSfn()?.name || "Non renseignée")}</div>
      <div><strong>Milieu :</strong> ${escapeHtml(state.environment || "Non renseigné")}</div>
      <div><strong>Impacts retenus :</strong> ${rows.length}</div>
    </div>

    <div class="report-kpis">
      <article>
        <span>${completed}/${rows.length}</span>
        <p>impacts renseignés</p>
      </article>
      <article>
        <span>${quantitativeCount}</span>
        <p>résultats quantitatifs</p>
      </article>
      <article>
        <span>${monetaryCount}</span>
        <p>résultats monétaires</p>
      </article>
      <article>
        <span>${strongCount}</span>
        <p>impacts d’importance forte</p>
      </article>
    </div>

    ${completed < rows.length ? `
      <div class="completion-warning">
        Certains impacts ne sont pas encore renseignés. Vous pouvez néanmoins imprimer
        cette synthèse ou retourner à l’étape 5 pour la compléter.
      </div>` : `
      <div class="completion-success">
        Tous les impacts retenus comportent au moins un résultat ou une appréciation d’importance.
      </div>`}

    <section class="report-section category-cost">
      <div class="section-heading">
        <div><span class="section-number">01</span><h3>Coûts</h3></div>
        <span class="category-count">${categories.cost.length} impact</span>
      </div>
      ${renderSummaryTable(categories.cost)}
    </section>

    <section class="report-section category-negative">
      <div class="section-heading">
        <div><span class="section-number">02</span><h3>Impacts négatifs</h3></div>
        <span class="category-count">${categories.negative.length} impact${categories.negative.length > 1 ? "s" : ""}</span>
      </div>
      ${renderSummaryTable(categories.negative)}
    </section>

    <section class="report-section category-benefit">
      <div class="section-heading">
        <div><span class="section-number">03</span><h3>Bénéfices</h3></div>
        <span class="category-count">${categories.benefit.length} impact${categories.benefit.length > 1 ? "s" : ""}</span>
      </div>
      ${renderSummaryTable(categories.benefit)}
    </section>

    <section class="report-section">
      <div class="section-heading">
        <div><span class="section-number">04</span><h3>Importance relative pour le territoire</h3></div>
      </div>
      ${renderImportanceChart(rows)}
      <div class="chart-legend">
        <span><i class="legend-low"></i>Faible</span>
        <span><i class="legend-medium"></i>Modérée</span>
        <span><i class="legend-high"></i>Forte</span>
      </div>
    </section>

    <section class="report-section interpretation-box">
      <div class="section-heading">
        <div><span class="section-number">05</span><h3>Clés de lecture</h3></div>
      </div>
      <p>
        Les résultats qualitatifs, quantitatifs et monétaires ne doivent pas être additionnés
        mécaniquement lorsqu’ils reposent sur des unités, périmètres ou horizons temporels différents.
        La décision doit également tenir compte des incertitudes, des effets distributifs et de
        l’importance relative de chaque impact pour le territoire.
      </p>
    </section>

    <div class="actions report-actions">
      <button class="secondary" id="previous-step">← Revenir à l’étape 5</button>
      <button class="secondary" id="print-report">Imprimer / enregistrer en PDF</button>
    </div>`;

  document.getElementById("previous-step").addEventListener("click", () => goToStep(5));
  document.getElementById("print-report").addEventListener("click", () => window.print());
}

loadData().catch(error => {
  document.getElementById("app").innerHTML = `
    <h2>Erreur de chargement</h2>
    <p>${error.message}</p>
    <p>Ouvrez le dossier avec Live Server dans Visual Studio Code.</p>`;
});
