

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

async function prepararEdicao(id) {
    const baseUrl = document.getElementById('serverUrl').value;
    const url = baseUrl.replace(/\/$/, "") + '/Patient/' + id;

    try {
        const response = await fetch(url);
        const p = await response.json();

        // Preenche os campos do formulário com os dados recebidos
        if (p.name && p.name.length > 0) {
            document.getElementById('inputNome').value = p.name[0].given ? p.name[0].given[0] : '';
            document.getElementById('inputSobrenome').value = p.name[0].family || '';
        }
        if (p.identifier && p.identifier.length > 0) {
            document.getElementById('inputCPF').value = p.identifier[0].value;
        }
        document.getElementById('selectGenero').value = p.gender || 'unknown';

        // IMPORTANTE: Preenche o campo oculto com o ID
        document.getElementById('pacienteId').value = id;

        // Muda a cor do botão para amarelo (aviso visual de edição)
        const btn = document.querySelector('#formCadastro button[type="submit"]');
        btn.textContent = "Atualizar Paciente";
        btn.className = "btn btn-warning";

        // Rola a tela até o formulário
        document.getElementById('formCadastro').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        alert("Erro ao buscar dados: " + error);
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

            // 2. Monta o Nome 
            let nomeCompleto = 'Sem nome';
            if (paciente.name && paciente.name.length > 0) {
                const given = paciente.name[0].given ? paciente.name[0].given.join(' ') : '';
                const family = paciente.name[0].family || '';
                nomeCompleto = `${given} ${family}`;
            }

            // Gênero
            const genero = paciente.gender || '-';

            // CPF
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
                    <td>
                        <button class="btn btn-warning btn-sm me-1" onclick="prepararEdicao('${id}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="deletarPaciente('${id}')">Excluir</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += linha;
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Erro: ${error}</td></tr>`;
    }
}


async function deletarPaciente(id) {
    if (!confirm("Tem certeza que deseja excluir o paciente " + id + "?")) {
        return; // Cancela se o usuário clicar em "Não"
    }

    const baseUrl = document.getElementById('serverUrl').value;
    const url = baseUrl.replace(/\/$/, "") + '/Patient/' + id;

    try {
        const response = await fetch(url, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Paciente excluído com sucesso!");
            listarPacientes(); // Atualiza a tabela
        } else {
            const erro = await response.json();
            alert("Erro ao excluir: " + JSON.stringify(erro));
        }

    } catch (error) {
        alert("Erro de conexão: " + error);
    }
}

async function salvarPacienteFormulario(event) {
    event.preventDefault();

    const baseUrl = document.getElementById('serverUrl').value;
    
    //Pega o ID do campo oculto (se tiver valor, é edição)
    const id = document.getElementById('pacienteId').value;
    
    const nome = document.getElementById('inputNome').value;
    const sobrenome = document.getElementById('inputSobrenome').value;
    const cpf = document.getElementById('inputCPF').value;
    const genero = document.getElementById('selectGenero').value;

    const paciente = {
        "resourceType": "Patient",
        "identifier": [{ "system": "http://hapi-fhir-test.com/patients", "value": cpf }],
        "name": [{ "family": sobrenome, "given": [nome] }],
        "gender": genero
    };

    let url;
    let method;

    // Lógica de Decisão: PUT ou POST
    if (id) {
        // edit
        paciente.id = id; 
        url = baseUrl.replace(/\/$/, "") + '/Patient/' + id;
        method = 'PUT';
    } else {
        // criar
        url = baseUrl.replace(/\/$/, "") + '/Patient';
        method = 'POST';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify(paciente)
        });

        if (response.ok) {
            alert(id ? "Paciente atualizado!" : "Paciente criado!");
            
            // Limpa tudo
            document.getElementById('formCadastro').reset();
            document.getElementById('pacienteId').value = ""; 
            
            // Volta o botão para o estado normal
            const btn = document.querySelector('#formCadastro button[type="submit"]');
            btn.textContent = "Salvar Paciente";
            btn.className = "btn btn-success";

            listarPacientes();
        } else {
            alert("Erro no servidor");
        }
    } catch (error) {
        alert("Erro: " + error);
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