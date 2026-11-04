const pool = require('../config/database');
const { getRestaurantDateTime } = require('../utils/dateTime');

const TABLE_FIELDS = ['numero', 'capacidade', 'status', 'posicaoX', 'posicaoY', 'rotacao'];

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

function validateTableFields(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return 'Informe os dados da mesa em um objeto JSON.';
    }
    if (Object.keys(data).length === 0) {
        return 'Informe pelo menos um campo da mesa.';
    }
    if (Object.keys(data).some((field) => !TABLE_FIELDS.includes(field))) {
        return 'Envie apenas numero, capacidade, status, posicaoX, posicaoY e rotacao.';
    }
    return '';
}

function validateTable(data) {
    const fieldsMessage = validateTableFields(data);
    if (fieldsMessage) return fieldsMessage;
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
        },

        async patchTable(req, res, next) {
            const id = req.params.id;
            if (!/^[1-9]\d*$/.test(id) || Number(id) > 4294967295) {
                return res.status(400).json({ message: 'Informe um ID de mesa válido.' });
            }
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A edição de mesas não aceita parâmetros de query.' });
            }
            const fieldsMessage = validateTableFields(req.body);
            if (fieldsMessage) return res.status(400).json({ message: fieldsMessage });

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                // A mesma trava será usada pelas operações de reserva e funcionamento.
                await Table.lockSettings(connection);
                const current = await Table.findById(id, connection);
                if (!current) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Mesa não encontrada.' });
                }

                const currentData = publicTable(current);
                const data = {};
                for (const field of TABLE_FIELDS) {
                    data[field] = Object.hasOwn(req.body, field) ? req.body[field] : currentData[field];
                }
                const validationMessage = validateTable(data);
                if (validationMessage) {
                    await connection.rollback();
                    return res.status(400).json({ message: validationMessage });
                }

                const makesUnavailable = data.status === 'indisponivel' && current.status !== data.status;
                if (makesUnavailable || data.capacidade < current.capacidade) {
                    const conflict = await Table.hasReservationConflict(id, {
                        capacidade: data.capacidade,
                        indisponivel: makesUnavailable,
                        now: getRestaurantDateTime()
                    }, connection);
                    if (conflict) {
                        await connection.rollback();
                        return res.status(409).json({ message: 'Esta alteração inviabiliza uma reserva ativa da mesa.' });
                    }
                }

                await Table.update(id, data, connection);
                const table = await Table.findById(id, connection);
                await connection.commit();
                res.json(publicTable(table));
            } catch (error) {
                if (connection) await connection.rollback();
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Já existe uma mesa com esse número.' });
                }
                next(error);
            } finally {
                if (connection) connection.release();
            }
        },

        async deleteTable(req, res, next) {
            const id = req.params.id;
            if (!/^[1-9]\d*$/.test(id) || Number(id) > 4294967295) {
                return res.status(400).json({ message: 'Informe um ID de mesa válido.' });
            }
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A exclusão de mesas não aceita parâmetros de query.' });
            }
            if (req.body && (Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
                return res.status(400).json({ message: 'A exclusão de mesas não aceita dados no corpo da requisição.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                await Table.lockSettings(connection);
                const table = await Table.findById(id, connection);
                if (!table) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Mesa não encontrada.' });
                }

                if (await Table.hasReservations(id, connection)) {
                    await connection.rollback();
                    return res.status(409).json({ message: 'Esta mesa possui reservas vinculadas e não pode ser excluída.' });
                }

                await Table.remove(id, connection);
                await connection.commit();
                res.json({ message: 'Mesa removida com sucesso.' });
            } catch (error) {
                if (connection) await connection.rollback();
                if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(409).json({ message: 'Esta mesa possui reservas vinculadas e não pode ser excluída.' });
                }
                next(error);
            } finally {
                if (connection) connection.release();
            }
        }
    };
};
