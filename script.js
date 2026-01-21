

// Função para exibir logs na tela e mudar a cor do badge
function logOutput(data, status) {
    const outputElement = document.getElementById('output');
    const badgeElement = document.getElementById('statusBadge');

    // Formata o JSON 
    outputElement.textContent = JSON.stringify(data, null, 2);

    // Verifica se é sucesso (200-299) ou erro
    if (status >= 200 && status < 300) {
        badgeElement.className = 'badge bg-success';
        badgeElement.textContent = `Sucesso (${status})`;
    } else {
        badgeElement.className = 'badge bg-danger';
        badgeElement.textContent = `Erro (${status})`;
    }
}


// 1. GET: Testa se o servidor está no ar 
async function testarConexao() {
    const baseUrl = document.getElementById('serverUrl').value;
    const outputElement = document.getElementById('output');
    const badgeElement = document.getElementById('statusBadge');

    // Remove barra final se houver e adiciona /metadata
    const url = baseUrl.replace(/\/$/, "") + '/metadata';
    
    outputElement.textContent = "Conectando ao servidor...";
    badgeElement.className = 'badge bg-warning text-dark';
    badgeElement.textContent = "Carregando...";
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        logOutput(data, response.status);
    } catch (error) {
        outputElement.textContent = "Erro de conexão: " + error + "\n\nDica: Verifique o CORS ou se o container Docker está rodando.";
        badgeElement.className = 'badge bg-danger';
        badgeElement.textContent = "Falha de Conexão";
    }
}

// Função para buscar e exibir os pacientes
async function listarPacientes() {
    const baseUrl = document.getElementById('serverUrl').value;
    const tbody = document.getElementById('tabelaPacientes');
    
    // URL para buscar pacientes, ordenados pelos mais recentes (_lastUpdated)
    const url = baseUrl.replace(/\/$/, "") + '/Patient?_sort=-_lastUpdated'; 

    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando dados...</td></tr>';

    try {
        const response = await fetch(url, {
            cache: 'no-store'
        });
        const data = await response.json();
        
        // Limpa a tabela antes de preencher
        tbody.innerHTML = '';

        // Verifica se existem pacientes na resposta (campo 'entry')
        if (!data.entry || data.entry.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum paciente encontrado.</td></tr>';
            return;
        }

        // Para cada paciente encontrado...
        data.entry.forEach(item => {
            const paciente = item.resource;
            
            // 1. Pega o ID
            const id = paciente.id || '#';

            // 2. Monta o Nome (trata caso venha vazio)
            let nomeCompleto = 'Sem nome';
            if (paciente.name && paciente.name.length > 0) {
                const given = paciente.name[0].given ? paciente.name[0].given.join(' ') : '';
                const family = paciente.name[0].family || '';
                nomeCompleto = `${given} ${family}`;
            }

            // 3. Pega o Gênero
            const genero = paciente.gender || '-';

            // 4. Pega o Identificador (CPF)
            let documento = '-';
            if (paciente.identifier && paciente.identifier.length > 0) {
                documento = paciente.identifier[0].value || '-';
            }

            // Cria a linha HTML
            const linha = `
                <tr>
                    <td><code>${id}</code></td>
                    <td><strong>${nomeCompleto}</strong></td>
                    <td>${genero}</td>
                    <td>${documento}</td>
                </tr>
            `;
            tbody.innerHTML += linha;
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Erro: ${error}</td></tr>`;
    }
}

async function salvarPacienteFormulario(event) {
    event.preventDefault();

    const baseUrl = document.getElementById('serverUrl').value;
    const url = baseUrl.replace(/\/$/, "") + '/Patient';

    // 2. Captura os valores digitados nos inputs
    const nome = document.getElementById('inputNome').value;
    const sobrenome = document.getElementById('inputSobrenome').value;
    const cpf = document.getElementById('inputCPF').value;
    const genero = document.getElementById('selectGenero').value;

    // 3. Monta o Objeto JSON FHIR
    const paciente = {
        "resourceType": "Patient",
        "identifier": [
            {
                "system": "http://hapi-fhir-test.com/patients", // fictício
                "value": cpf
            }
        ],
        "name": [
            {
                "family": sobrenome,
                "given": [nome]
            }
        ],
        "gender": genero
    };

    const outputElement = document.getElementById('output');
    outputElement.textContent = "Enviando dados...";

    // 4. Envia para o Servidor (POST)
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/fhir+json'
            },
            body: JSON.stringify(paciente)
        });

        const data = await response.json();
        logOutput(data, response.status);

        if (response.ok) {
            alert("Paciente cadastrado com sucesso!");
           document.getElementById('formCadastro').reset();
            listarPacientes(); 
        }   

    } catch (error) {
        outputElement.textContent = "Erro ao salvar: " + error;
    }
}

// Configuração dos Botões 
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnGet').addEventListener('click', testarConexao);
    document.getElementById('btnListar').addEventListener('click', listarPacientes);
    
    const form = document.getElementById('formCadastro');
    if (form) {
        form.addEventListener('submit', salvarPacienteFormulario);
    }
});