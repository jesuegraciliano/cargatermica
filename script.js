// Aguarda o carregamento completo do DOM para iniciar o script
document.addEventListener('DOMContentLoaded', () => {

    // 1. Constantes com os valores ajustados conforme a imagem.
    // HEAT_GAIN_FACTORS agora corresponde à coluna "Fator".
    // Os fatores para cada categoria foram extraídos diretamente da imagem fornecida.
    const HEAT_GAIN_FACTORS = {
        // 1. JANELAS
        "janela_oeste_com_cortina": 353,
        "janela_sol_se_so_com_cortina": 245,
        "janela_sol_ne_no_com_cortina": 284,
        "janela_norte": 160,
        "janelas_sombra": 42,
        "janelas_oeste_sem_cortina": 530,

        // 2. CONSTRUÇÃO
        "parede_ao_sol_oeste": 43,
        "parede_ao_sol_norte": 25,
        "paredes_não_ensolaradas": 18,
        "telhado_com_laje": 49,
        "laje_entre_andares": 9,
        "piso_entre_andares": 12,

        // 3. ILUMINAÇÃO E EQUIPAMENTOS
        "iluminacao": 1.032,
        "equipamentos": 0.86,

        // 4. ATIVIDADE
        "trabalho_escritorio": 111,

        // 5. VENTILAÇÃO
        "ventilacao": 8.2
    };

    const BTU_PER_KCAL = 3.96832;
    const BTU_PER_TR = 12000.0;

    // =================================================================================
    // CORREÇÃO PRINCIPAL: As chaves e rótulos foram alinhados com HEAT_GAIN_FACTORS
    // =================================================================================
    const PARCEL_DEFINITIONS = {
        // 1. JANELAS
        "janela_oeste_com_cortina": { label: "Janela OESTE c/ cortina (m²)", default: 0, type: "Area" },
        "janela_sol_se_so_com_cortina": { label: "Janela SE/SO c/ cortina (m²)", default: 0, type: "Area" },
        "janela_sol_ne_no_com_cortina": { label: "Janela NE/NO c/ cortina (m²)", default: 0, type: "Area" },
        "janela_norte": { label: "Janela NORTE (m²)", default: 0, type: "Area" },
        "janelas_sombra": { label: "Janelas à sombra (m²)", default: 0, type: "Area" },
        "janelas_oeste_sem_cortina": { label: "Janela OESTE s/ cortina (m²)", default: 0, type: "Area" },

        // 2. CONSTRUÇÃO
        "parede_ao_sol_oeste": { label: "Parede ao sol OESTE (m²)", default: 0, type: "Area" },
        "parede_ao_sol_norte": { label: "Parede ao sol NORTE (m²)", default: 0, type: "Area" },
        "paredes_não_ensolaradas": { label: "Paredes não ensolaradas (m²)", default: 0, type: "Area" },
        "telhado_com_laje": { label: "Telhado com laje (m²)", default: 0, type: "Area" },
        "laje_entre_andares": { label: "Laje entre andares (m²)", default: 0, type: "Area" },
        "piso_entre_andares": { label: "Piso entre andares (m²)", default: 0, type: "Area" },

        // 3. ILUMINAÇÃO E EQUIPAMENTOS
        "iluminacao": { label: "Iluminação (W)", default: 0, type: "Potencia" },
        "equipamentos": { label: "Equipamentos (W)", default: 0, type: "Potencia" },

        // 4. ATIVIDADE
        "trabalho_escritorio": { label: "Trabalho de escritório (pessoas)", default: 0, isInteger: true, type: "Pessoas" },

        // 5. VENTILAÇÃO
        "ventilacao": { label: "Ventilação / Renovação (m³/h)", default: 0, type: "Vazao" }
    };

    // 2. Referências aos elementos HTML
    const inputRowsContainer = document.getElementById('inputRows');
    const totalKcalhSpan = document.getElementById('totalKcalh');
    const totalBtuhSpan = document.getElementById('totalBtuh');
    const totalTrSpan = document.getElementById('totalTr');
    const errorMessagesDiv = document.getElementById('errorMessages');

    const inputElements = {};
    const calculatedLoadSpans = {};

    // 3. Gera as Linhas de Entrada Dinamicamente
    function generateInputRows() {
        for (const key in PARCEL_DEFINITIONS) {
            const parcel = PARCEL_DEFINITIONS[key];
            const factor = HEAT_GAIN_FACTORS[key];

            const row = document.createElement('div');
            row.classList.add('table-row');

            row.innerHTML = `
                <span class="row-label">${parcel.label}</span>
                <span class="row-input">
                    <input type="number" id="input_${key}" value="${parcel.default}" min="0" step="${parcel.isInteger ? '1' : 'any'}">
                </span>
                <span class="row-factor" data-label="Fator Fixo">${factor !== undefined ? factor : '-'}</span>
                <span class="row-calculated-load" data-label="Carga Térmica (kcal/h)">0 kcal/h</span>
            `;
            // ^^^^^^ AQUI ESTÁ A MUDANÇA: Adicionado " kcal/h" ao final do span.

            inputRowsContainer.appendChild(row);

            const input = document.getElementById(`input_${key}`);
            inputElements[key] = input;
            calculatedLoadSpans[key] = row.querySelector('.row-calculated-load');
            input.addEventListener('input', calculateAndDisplayAll);
        }
    }

    // 4. Obtém e Valida as Entradas do Usuário
    function getInputs() {
        const inputs = {};
        let hasError = false;
        errorMessagesDiv.style.display = 'none';
        errorMessagesDiv.innerHTML = '';

        for (const key in PARCEL_DEFINITIONS) {
            const inputElement = inputElements[key];
            const valueStr = inputElement.value.replace(',', '.');
            const value = parseFloat(valueStr);

            if (isNaN(value) || value < 0) {
                displayError(`Valor inválido para "${PARCEL_DEFINITIONS[key].label}". Use apenas números positivos.`);
                inputElement.classList.add('error-input');
                hasError = true;
            } else {
                inputs[key] = value;
                inputElement.classList.remove('error-input');
            }
        }
        return hasError ? null : inputs;
    }

    function displayError(message) {
        errorMessagesDiv.style.display = 'block';
        errorMessagesDiv.innerHTML += `<p>${message}</p>`;
    }

    // 5. Calcula a Carga Térmica
    function calculateThermalLoad(inputs) {
        const individualLoads = {};
        let totalKcalh = 0;

        for (const key in inputs) {
            const factor = HEAT_GAIN_FACTORS[key];
            let calculatedLoad = 0;

            if (factor !== undefined) {
                calculatedLoad = inputs[key] * factor;
            } else {
                console.warn(`Fator não encontrado para a chave: ${key}. A carga para este item será 0.`);
            }

            individualLoads[key] = calculatedLoad;
            totalKcalh += calculatedLoad;
        }

        const totalBtuh = totalKcalh * BTU_PER_KCAL;
        const totalTr = totalBtuh / BTU_PER_TR;

        return { individualLoads, totalKcalh, totalBtuh, totalTr };
    }

    // 6. Exibe os Resultados na Interface
    function displayResults(results) {
        if(totalKcalhSpan) totalKcalhSpan.textContent = results.totalKcalh.toFixed(0);
        if(totalBtuhSpan) totalBtuhSpan.textContent = results.totalBtuh.toFixed(0);
        if(totalTrSpan) totalTrSpan.textContent = results.totalTr.toFixed(1);

        for (const key in PARCEL_DEFINITIONS) {
            const load = results.individualLoads[key] || 0;
            if (calculatedLoadSpans[key]) {
                // AQUI TAMBÉM: Adicionado " kcal/h" ao final do texto exibido.
                calculatedLoadSpans[key].textContent = `${load.toFixed(0)} kcal/h`;
            }
        }
    }

    // Função principal que orquestra o cálculo e a exibição
    function calculateAndDisplayAll() {
        const inputs = getInputs();
        if (inputs) {
            const results = calculateThermalLoad(inputs);
            displayResults(results);
        } else {
            displayResults({ totalKcalh: 0, totalBtuh: 0, totalTr: 0, individualLoads: {} });
        }
    }

    // Inicialização da aplicação
    generateInputRows();
    calculateAndDisplayAll();
});
