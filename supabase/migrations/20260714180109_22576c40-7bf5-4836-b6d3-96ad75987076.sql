
-- Setores
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO anon, authenticated;
GRANT ALL ON public.setores TO service_role;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setores_all" ON public.setores FOR ALL USING (true) WITH CHECK (true);

-- Vagas
CREATE TABLE public.vagas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  capacidade INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  imagem_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vagas_setor_idx ON public.vagas(setor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vagas TO anon, authenticated;
GRANT ALL ON public.vagas TO service_role;
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vagas_all" ON public.vagas FOR ALL USING (true) WITH CHECK (true);

-- Caixas
CREATE TABLE public.caixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  descricao TEXT,
  imagem_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX caixas_vaga_idx ON public.caixas(vaga_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas TO anon, authenticated;
GRANT ALL ON public.caixas TO service_role;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "caixas_all" ON public.caixas FOR ALL USING (true) WITH CHECK (true);

-- Movimentações de caixa
CREATE TABLE public.movimentacoes_caixa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id UUID NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
  vaga_origem_id UUID REFERENCES public.vagas(id) ON DELETE SET NULL,
  vaga_destino_id UUID REFERENCES public.vagas(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mov_caixa_idx ON public.movimentacoes_caixa(caixa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_caixa TO anon, authenticated;
GRANT ALL ON public.movimentacoes_caixa TO service_role;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov_all" ON public.movimentacoes_caixa FOR ALL USING (true) WITH CHECK (true);
