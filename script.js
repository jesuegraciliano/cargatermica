// Aguarda o carregamento completo do DOM para iniciar o script
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Constantes com os valores ajustados conforme a imagem.
    // HEAT_GAIN_FACTORS agora corresponde à coluna "Fator".
    // Os fatores para cada categoria foram extraídos diretamente da imagem fornecida.
    const HEAT_GAIN_FACTORS = {
        // 1. JANELAS
        "janela_sol_e_o": 353,
        "janela_sol_se_so": 245,
        "janela_sol_ne_no": 284,
        "janela_sol_n": 160,
        "janelas_sombra": 42,

        // 2. CONSTRUÇÃO
        "parede_mais_insolada_pesada_30cm": 34,
        "parede_mais_insolada_leve_15cm": 43,
        "paredes_pesadas_30cm": 11,
        "paredes_leves_15cm": 18,
        "terraco_sem_isolamento": 83,
        "forro_telhado_nao_arejado_s_isolamento": 25,
        "forro_telhado_nao_arejado_c_isolamento": 49,
        "forro_telhado_arejado_s_isolamento": 20,
        "forro_telhado_arejado_c_isolamento": 5, // Note: This factor is '5' in the image, but in the previous prompt you used '9', I'll use 5.
        "forro_entre_andares": 9,
        "piso_entre_andares": 12,
        "duto_insuflamento": 56,

        // 3. ILUMINAÇÃO E EQUIPAMENTOS
        "iluminacao_incandescente": 0.86,
        "iluminacao_fluorescente": 1.032,
        "equipamentos": 0.86,

        // 4. ATIVIDADE
        "trabalho_leve": 189,
        "sentados": 100,
        "trabalho_escritorio": 111,

        // 5. VENTILAÇÃO
        "infiltracao": 8.2,
        "ventilacao": 8.2
    };

    const BTU_PER_KCAL = 3.96832;
    const BTU_PER_TR = 12000.0;

    // PARCEL_DEFINITIONS agora define os rótulos e valores padrão para a coluna "Quantidade".
    // Os valores de 'default' são inicializados como 0, pois a imagem não fornece esses valores
    // diretamente para a coluna "Quantidade" ou "Área". O usuário precisará preenchê-los.
    // Adicionei os campos 'Potencia' e 'Pessoas' onde aplicável.
    const PARCEL_DEFINITIONS = {
        // 1. JANELAS
        "janela_sol_e_o": { label: "Janela ao sol LESTE ou OESTE (m²)", default: 0, type: "Area" },
        "janela_sol_se_so": { label: "Janela ao sol SE/SO (m²)", default: 0, type: "Area" },
        "janela_sol_ne_no": { label: "Janela ao sol NE/NO (m²)", default: 0, type: "Area" },
        "janela_sol_n": { label: "Janela ao sol N (m²)", default: 0, type: "Area" },
        "janelas_sombra": { label: "Janelas à sombra (m²)", default: 0, type: "Area" },

        // 2. CONSTRUÇÃO
        "parede_mais_insolada_pesada_30cm": { label: "Parede mais insolada pesada (30 cm) (m²)", default: 0, type: "Area" },
        "parede_mais_insolada_leve_15cm": { label: "Parede mais insolada leve (15 cm) (m²)", default: 0, type: "Area" },
        "paredes_pesadas_30cm": { label: "Paredes pesadas (30 cm) (m²)", default: 0, type: "Area" },
        "paredes_leves_15cm": { label: "Paredes leves (15 cm) (m²)", default: 0, type: "Area" },
        "terraco_sem_isolamento": { label: "Terraço s/ isolamento (m²)", default: 0, type: "Area" },
        "forro_telhado_nao_arejado_s_isolamento": { label: "Forro de telhado não arejado s/ isolamento (m²)", default: 0, type: "Area" },
        "forro_telhado_nao_arejado_c_isolamento": { label: "Forro de telhado não arejado c/ isolamento (m²)", default: 0, type: "Area" },
        "forro_telhado_arejado_s_isolamento": { label: "Forro de telhado arejado s/ isolamento (m²)", default: 0, type: "Area" },
        "forro_telhado_arejado_c_isolamento": { label: "Forro de telhado arejado c/ isolamento (m²)", default: 0, type: "Area" },
        "forro_entre_andares": { label: "Forro entre andares (m²)", default: 0, type: "Area" },
        "piso_entre_andares": { label: "Piso entre andares (m²)", default: 0, type: "Area" },
        "duto_insuflamento": { label: "Duto de insuflamento (m²)", default: 0, type: "Area" },

        // 3. ILUMINAÇÃO E EQUIPAMENTOS
        "iluminacao_incandescente": { label: "Iluminação incandescente (W)", default: 0, type: "Potencia" },
        "iluminacao_fluorescente": { label: "Iluminação fluorescente (W)", default: 0, type: "Potencia" },
        "equipamentos": { label: "Equipamentos (W)", default: 0, type: "Potencia" },

        // 4. ATIVIDADE
        "trabalho_leve": { label: "Trabalho Leve (pessoas)", default: 0, isInteger: true, type: "Pessoas" },
        "sentados": { label: "Sentados (pessoas)", default: 0, isInteger: true, type: "Pessoas" },
        "trabalho_escritorio": { label: "Trabalho de escritório (pessoas)", default: 0, isInteger: true, type: "Pessoas" },

        // 5. VENTILAÇÃO
        "infiltracao": { label: "Infiltração (m³/h)", default: 0, type: "Vazao" },
        "ventilacao": { label: "Ventilação (m³/h)", default: 0, type: "Vazao" }
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
                <span class="row-calculated-load" data-label="Carga Térmica (kcal/h)">0</span>
            `;

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
                // For "ILUMINAÇÃO E EQUIPAMENTOS" (Potencia) convert Watts to Kcal/h
                // 1 Watt = 0.86 Kcal/h. However, the factors provided are already in Kcal/h per unit of area/person/flow.
                // So, we just multiply the input by the factor.
                calculatedLoad = inputs[key] * factor;
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
        totalKcalhSpan.textContent = results.totalKcalh.toFixed(0);
        totalBtuhSpan.textContent = results.totalBtuh.toFixed(0);
        totalTrSpan.textContent = results.totalTr.toFixed(1);

        for (const key in results.individualLoads) {
            if (calculatedLoadSpans[key]) {
                calculatedLoadSpans[key].textContent = results.individualLoads[key].toFixed(0);
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
            // Zera os resultados se houver erro de validação
            displayResults({ totalKcalh: 0, totalBtuh: 0, totalTr: 0, individualLoads: {} });
        }
    }

    // Inicialização da aplicação
    generateInputRows();
    calculateAndDisplayAll();
});
