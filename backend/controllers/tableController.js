function publicTable(table) {
    return {
        id: String(table.id),
        numero: table.numero,
        capacidade: table.capacidade,
        status: table.status,
        posicaoX: table.posicao_x,
        posicaoY: table.posicao_y,
        rotacao: table.rotacao,
        createdAt: Number(table.created_at_ms),
        updatedAt: Number(table.updated_at_ms)
    };
}

function validateTable(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return 'Informe os dados da mesa em um objeto JSON.';
    }
    const fields = ['numero', 'capacidade', 'status', 'posicaoX', 'posicaoY', 'rotacao'];
    if (Object.keys(data).some((field) => !fields.includes(field))) {
        return 'Envie apenas numero, capacidade, status, posicaoX, posicaoY e rotacao.';
    }
    if (!Number.isInteger(data.numero) || data.numero < 1 || data.numero > 65535) {
        return 'Informe um número de mesa inteiro entre 1 e 65535.';
    }
    if (!Number.isInteger(data.capacidade) || data.capacidade < 1 || data.capacidade > 8) {
        return 'A capacidade deve ser um número inteiro entre 1 e 8.';
    }
    if (!['disponivel', 'indisponivel'].includes(data.status)) {
        return 'O status deve ser disponivel ou indisponivel.';
    }
    if (![0, 90].includes(data.rotacao)) {
        return 'A rotação deve ser 0 ou 90.';
    }
    if (!Number.isInteger(data.posicaoX) || !Number.isInteger(data.posicaoY)
        || data.posicaoX < 0 || data.posicaoY < 0) {
        return 'Informe posições inteiras e não negativas para a mesa.';
    }

    const baseWidth = data.capacidade > 6 ? 288 : data.capacidade > 4 ? 192 : 96;
    const width = data.rotacao === 90 ? 96 : baseWidth;
    const height = data.rotacao === 90 ? baseWidth : 96;
    if (data.posicaoX + width > 800 || data.posicaoY + height > 520) {
        return 'A posição da mesa está fora dos limites do mapa.';
    }
    return '';
}

module.exports = function createTableController(Table) {
    return {
        async getTables(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A listagem de mesas não aceita filtros.' });
            }

            try {
                const tables = await Table.findAll();
                res.json(tables.map(publicTable));
            } catch (error) {
                next(error);
            }
        },

        async postTable(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'O cadastro de mesas não aceita parâmetros de query.' });
            }
            const validationMessage = validateTable(req.body);
            if (validationMessage) {
                return res.status(400).json({ message: validationMessage });
            }

            const { numero, capacidade, status, posicaoX, posicaoY, rotacao } = req.body;
            try {
                const id = await Table.create({ numero, capacidade, status, posicaoX, posicaoY, rotacao });
                const table = await Table.findById(id);
                res.status(201).json(publicTable(table));
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Já existe uma mesa com esse número.' });
                }
                next(error);
            }
        }
    };
};
