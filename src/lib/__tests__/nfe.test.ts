// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { chaveAcessoValida, lerXmlNfe, problemasConfirmacao } from "../nfe";

const CHAVE = "35260912345678000190550010000123451000123452";
const XML = `<?xml version="1.0"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${CHAVE}" versao="4.00">
<ide><serie>1</serie><nNF>12345</nNF><dhEmi>2026-10-30T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000190</CNPJ><xNome>Embalagens Teste Ltda</xNome><xFant>EmbTeste</xFant><enderEmit><UF>SP</UF><fone>1133334444</fone></enderEmit><IE>123</IE></emit>
<det nItem="1"><prod><cProd>A1</cProd><cEAN>7891234560012</cEAN><xProd>CAIXA 30X20</xProd><NCM>48191000</NCM><uCom>CX</uCom><qCom>10.0000</qCom><vUnCom>5.50</vUnCom><vProd>55.00</vProd></prod></det>
<det nItem="2"><prod><cProd>B2</cProd><cEAN>SEM GTIN</cEAN><xProd>FITA</xProd><uCom>UN</uCom><qCom>3</qCom><vUnCom>2</vUnCom><vProd>6.00</vProd></prod></det>
<total><ICMSTot><vNF>61.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;

describe("leitura de NF-e", () => {
  it("lê cabeçalho e linhas reais do XML", () => {
    const { cabecalho, linhas } = lerXmlNfe(XML);
    expect(cabecalho.chave_acesso).toBe(CHAVE);
    expect(cabecalho.numero).toBe("12345");
    expect(cabecalho.data_emissao).toBe("2026-10-30");
    expect(cabecalho.emit_documento).toBe("12345678000190");
    expect(cabecalho.valor_total).toBe(61);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({ ean: "7891234560012", quantidade: 10, valor_total: 55, unidade: "CX" });
    expect(linhas[1].ean).toBeNull(); // SEM GTIN
  });

  it("rejeita XML que não é NF-e", () => {
    expect(() => lerXmlNfe("<a><b/></a>")).toThrow(/não é uma NF-e/);
  });

  it("valida dígito verificador da chave", () => {
    expect(chaveAcessoValida(CHAVE)).toBe(true);
    expect(chaveAcessoValida(CHAVE.slice(0, 43) + "9")).toBe(false);
    expect(chaveAcessoValida("123")).toBe(false);
  });
});

describe("regras de confirmação", () => {
  const cab = lerXmlNfe(XML).cabecalho;
  it("aceita nota completa com linhas vinculadas e positivas", () => {
    expect(problemasConfirmacao(cab, [{ quantidade: 10, fator: 1, item_id: "x" }])).toEqual([]);
  });
  it("bloqueia linha sem vínculo", () => {
    expect(problemasConfirmacao(cab, [{ quantidade: 10, fator: 1, item_id: null }]).join()).toMatch(/sem item vinculado/);
  });
  it("bloqueia quantidade ou fator zero", () => {
    expect(problemasConfirmacao(cab, [{ quantidade: 10, fator: 0, item_id: "x" }]).join()).toMatch(/não positivo/);
    expect(problemasConfirmacao(cab, [{ quantidade: 0, fator: 1, item_id: "x" }]).join()).toMatch(/não positivo/);
  });
  it("bloqueia chave com menos de 44 dígitos", () => {
    expect(problemasConfirmacao({ ...cab, chave_acesso: "123" }, [{ quantidade: 1, fator: 1, item_id: "x" }]).join()).toMatch(/44 dígitos/);
  });
});
