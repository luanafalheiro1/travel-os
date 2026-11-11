# Travel OS

Planejador, mapa e diário de viagens pessoal.

- **Site:** https://luanafalheiro1.github.io/travel-os/
- **Stack:** React + TypeScript + Vite, Google Maps JavaScript API e Places API (New).
- **Dados:** ficam no navegador (localStorage) e as fotos no aparelho (IndexedDB). Use *Ajustes → Baixar backup*.
- **Chave do Google:** colada em *Ajustes*, nunca no código. Restrinja por referenciador HTTP ao endereço do site.
- **Publicação:** cada push na branch `main` publica no GitHub Pages pelo workflow em `.github/workflows/deploy.yml`.

## Rodar localmente

```bash
npm install
npm run dev
```

## Próxima fase

Sincronizar os dados entre aparelhos (Supabase), para que duas pessoas editem a mesma viagem.
