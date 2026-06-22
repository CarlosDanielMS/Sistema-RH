-- init.sql
-- Executado automaticamente pelo PostgreSQL na primeira inicialização.
-- O SQLAlchemy também cria as tabelas via create_all(), mas este script
-- garante índices e extensões extras.

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- busca por texto parcial

-- Índices extras de performance
CREATE INDEX IF NOT EXISTS idx_candidatos_vaga     ON candidatos (vaga_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_status   ON candidatos (status_triagem);
CREATE INDEX IF NOT EXISTS idx_candidatos_etapa    ON candidatos (etapa_pipeline);
CREATE INDEX IF NOT EXISTS idx_decisoes_candidato  ON decisoes (candidato_id);
CREATE INDEX IF NOT EXISTS idx_decisoes_vaga       ON decisoes (vaga_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_candidato  ON pipeline_historico (candidato_id);
CREATE INDEX IF NOT EXISTS idx_vagas_status        ON vagas (status);

-- View útil para relatórios de pipeline
CREATE OR REPLACE VIEW vw_pipeline_resumo AS
SELECT
    v.id                 AS vaga_id,
    v.titulo             AS titulo_vaga,
    c.etapa_pipeline     AS etapa,
    COUNT(c.id)          AS total_candidatos,
    ROUND(AVG(c.score_aderencia)::numeric, 1) AS score_medio
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_id = v.id
GROUP BY v.id, v.titulo, c.etapa_pipeline
ORDER BY v.id, c.etapa_pipeline;
