module.exports = function createTableController(Table) {
    return {
        async getTables(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A listagem de mesas não aceita filtros.' });
            }

            try {
                const tables = await Table.findAll();
                res.json(tables.map((table) => ({
                    id: String(table.id),
                    numero: table.numero,
                    capacidade: table.capacidade,
                    status: table.status,
                    posicaoX: table.posicao_x,
                    posicaoY: table.posicao_y,
                    rotacao: table.rotacao,
                    createdAt: Number(table.created_at_ms),
                    updatedAt: Number(table.updated_at_ms)
                })));
            } catch (error) {
                next(error);
            }
        }
    };
};
