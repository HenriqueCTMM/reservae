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

module.exports = { publicTable };
