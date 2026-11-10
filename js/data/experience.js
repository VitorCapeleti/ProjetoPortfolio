/* Experiência profissional, formação, certificados e stack.
 * Fonte: perfil do LinkedIn (linkedin.com/in/vitor-capeleti), novembro de 2026.
 * Datas no formato "AAAA-MM"; end: null = "o momento" (a duração é calculada na view).
 * project: slug de window.PROJECTS quando a experiência tem um projeto no portfólio.
 */
window.EXPERIENCE = [
  {
    id: "fenox",
    company: "Fenox Tecnologia",
    role: "Engenheiro de IA / Engenheiro de Software",
    type: "Tempo integral",
    mode: "No local",
    location: "São José dos Campos, SP",
    start: "2026-10",
    end: null,
    stack: ["Claude Code", "Ruby on Rails", "Vue.js", "Python", "TypeScript", "CI/CD"],
    highlights: [
      "Estruturação inicial de um sistema de gerenciamento interno, com foco na centralização de informações e na otimização dos processos da empresa.",
      "Desenvolvimento inicial de uma solução própria de atendimento interno, visando substituir um software de terceiros com alto custo de assinatura e reduzir despesas recorrentes.",
      "Aplicação de ferramentas de Engenharia de IA, como Claude Code, para apoiar o desenvolvimento, acelerar a implementação de funcionalidades e otimizar o fluxo de trabalho.",
      "Atuação com práticas de CI/CD, contribuindo para a padronização e a eficiência dos processos de desenvolvimento e entrega de software."
    ],
    indicators: [
      { label: "Redução de custos", text: "comparação entre o valor das assinaturas substituídas e o custo de manutenção da solução própria." },
      { label: "Centralização de informações", text: "redução da dispersão de dados entre ferramentas e maior facilidade de acesso ao histórico de atendimentos." },
      { label: "Eficiência operacional", text: "acompanhamento do volume de solicitações atendidas, do tempo médio de atendimento e do tempo necessário para resolução de demandas." },
      { label: "Produtividade da equipe", text: "monitoramento da quantidade de solicitações concluídas e da redução de tarefas manuais e repetitivas." }
    ],
    project: null
  },
  {
    id: "cortapp",
    company: "Cortapp",
    role: "Líder, Desenvolvedor Full-stack",
    type: "Tempo integral",
    mode: "Remoto",
    location: "São José dos Campos, SP",
    start: "2025-07",
    end: null,
    stack: ["PHP", "Laravel", "Artisan", "API REST", "Angular", "Ionic", "DDD", "MySQL"],
    highlights: [
      "Estruturação do código Backend, aplicando conceitos de código limpo.",
      "Sistema de pagamento e assinaturas com API externa do Mercado Pago.",
      "Otimização de código, aumento de legibilidade e manutenibilidade."
    ],
    indicators: [],
    project: null
  },
  {
    id: "bankup",
    company: "Bankup.online",
    role: "Desenvolvedor Full-stack · Backend Scrum Master",
    type: "Terceirizado",
    mode: "Híbrido",
    location: "Jacareí, SP",
    start: "2025-04",
    end: "2025-12",
    stack: ["JavaScript", "Node.js", "PostgreSQL", "Docker", "Scrum"],
    highlights: [
      "Organizei a arquitetura do projeto junto com minha equipe, separando por camadas de responsabilidade.",
      "Otimizei a produtividade, com análises de tempo de entregas e atuações.",
      "Apliquei conceitos de código limpo."
    ],
    indicators: [],
    project: "bankup"
  },
  {
    id: "inpe",
    company: "INPE — Instituto Nacional de Pesquisas Espaciais",
    role: "Iniciação Científica, Desenvolvedor Python",
    type: "PIBIC/CNPq · Temporário",
    mode: "Híbrido",
    location: "São José dos Campos, SP",
    start: "2024-09",
    end: "2025-09",
    stack: ["Python", "Pandas", "Flask", "Matplotlib", "Artificial Bee Colony", "HTML/CSS"],
    highlights: [
      "Otimização de processo: ações que duravam 3 horas reduzidas para 2–5 minutos.",
      "Extração, limpeza e carregamento de enormes quantidades de dados.",
      "Interface interativa para o usuário."
    ],
    metric: { value: "3 h → 2–5 min", label: "tempo de processamento" },
    indicators: [],
    project: "abc-espessura"
  }
];

window.EDUCATION = [
  {
    school: "Fatec Taubaté",
    course: "Tecnólogo em Análise e Desenvolvimento de Sistemas",
    start: "2024-02",
    end: "2025-12"
  },
  {
    school: "Etec Dr. Geraldo José Rodrigues Alckmin",
    course: "Ensino Técnico em Desenvolvimento de Sistemas",
    start: "2021-01",
    end: "2023-11"
  }
];

window.CERTIFICATIONS = [
  { name: "Fundamentos de Linguagem Python do Básico a Aplicações de IA", issuer: "Data Science Academy", date: "2026-10", note: "96 horas · aproveitamento de 98%" },
  { name: "Prompt Design in Vertex AI Skill Badge", issuer: "Google Cloud", date: "2025-10" },
  { name: "AWS Academy Graduate — Machine Learning Foundations", issuer: "Amazon Web Services", date: "2025-09" }
];

/* Stack alinhada ao "Sobre" do LinkedIn (principais tecnologias e áreas de atuação). */
window.STACK = [
  { group: "Back-end", items: ["PHP", "Laravel", "Ruby on Rails", "Python", "Java", "Node.js"] },
  { group: "Front-end", items: ["JavaScript", "TypeScript", "Angular", "Ionic", "Vue.js", "HTML", "CSS"] },
  { group: "Banco de dados", items: ["SQL", "MySQL", "PostgreSQL"] },
  { group: "Arquitetura", items: ["DDD", "APIs REST", "Código limpo", "Integração de sistemas", "Metodologias ágeis"] },
  { group: "Ferramentas & IA", items: ["Git", "GitHub", "Docker", "CI/CD", "Claude Code"] }
];
