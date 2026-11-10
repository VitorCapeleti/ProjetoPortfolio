/* Dados dos projetos — gerado a partir das páginas originais em pages/projects/.
 * Ultron e Spac-Y foram adicionados depois (sem página antiga: legacy null). */
window.PROJECTS = [
  {
    slug: "ultron",
    legacy: null,
    title: "ULTRON",
    pageTitle: "Ultron Orchestrator",
    summary: "Plugin para o Claude Code que orquestra modelos por etapa: o /ultron classifica a tarefa, monta um fluxo de subagentes com o modelo e o effort certos, pede aprovação e mostra a jornada num dashboard…",
    cover: { src: "img/opt/ultron1.webp", fallback: "img/ultron1.png", alt: "Dashboard do Ultron mostrando a jornada de um fluxo em ondas" },
    sections: [
      {
        heading: "Finalidade do Projeto",
        image: { src: "img/opt/ultron1.webp", fallback: "img/ultron1.png", alt: "Jornada de um fluxo no dashboard do Ultron" },
        text: "Uma sessão do Claude Code roda inteira num modelo e num effort escolhidos no início, mas quase toda tarefa mistura trabalho barato, como mapear arquivos e escrever documentação, com trabalho difícil, como desenhar uma arquitetura ou revisar segurança. O Ultron separa a tarefa em etapas e escolhe o par modelo/effort de cada uma (Haiku, Sonnet ou Opus), delegando cada etapa a um subagente. Nada roda antes da aprovação do plano, e qualquer edição gera uma nova revisão que precisa ser aprovada de novo."
      },
      {
        heading: "Tecnologias Utilizadas",
        image: { src: "img/opt/ultron2.webp", fallback: "img/ultron2.png", alt: "Dashboard de sessões do Ultron agrupadas por repositório" },
        text: "O Ultron é um mod do Claude Code, construído com hooks de função, uma skill e uma CLI em Node.js sem dependências, escrita em JavaScript e TypeScript. O dashboard local edita o plano em tempo real (modelo, effort, papel, ondas e dependências de cada etapa), reúne todas as sessões abertas agrupadas por repositório e dá a cada repositório o nome e a cor de uma IA da Marvel, como JARVIS e F.R.I.D.A.Y."
      },
      {
        heading: "Considerações Finais",
        image: { src: "img/opt/ultron4.webp", fallback: "img/ultron4.png", alt: "Ultron em pixel art chegando ao fim da jornada" },
        text: "Além de orquestrar tarefas, o Ultron faz revisão de PR como um QA sênior: contexto, auditoria e testes em paralelo, validação adversarial dos achados e um comentário publicado só com a minha aprovação. Um mini Ultron em pixel art anda de etapa em etapa até a bandeira. Este próprio portfólio foi animado com o Ultron orquestrando os subagentes."
      }
    ],
    repo: "https://github.com/VitorCapeleti/ultron-orchestrator",
    tags: ["IA", "Claude Code", "Node.js", "TypeScript", "JavaScript"]
  },
  {
    slug: "spac-y",
    legacy: null,
    title: "SPAC-Y",
    pageTitle: "Spac-Y",
    summary: "O Spac-Y é uma ferramenta web que desenvolvi para facilitar a análise de arquivos CSV, gerando gráficos e relatórios dinâmicos com a ajuda de IA…",
    cover: { src: "img/opt/spacy1.webp", fallback: "img/spacy1.png", alt: "Tela do Spac-Y com a tabela de gastos e o gráfico de barras" },
    sections: [
      {
        heading: "Finalidade do Projeto",
        image: { src: "img/opt/spacy3.webp", fallback: "img/spacy3.png", alt: "Relatório detalhado gerado pela IA do Spac-Y" },
        text: "Usar planilhas para acompanhar gastos mensais até funcionava, mas gerar análises e gráficos de forma prática ainda era um processo lento. Foi daí que surgiu o Spac-Y: uma ferramenta web para facilitar a análise de arquivos CSV, permitindo gerar gráficos e relatórios dinâmicos de forma rápida e intuitiva. A proposta é simples: você fornece os dados, e a IA ajuda a transformá-los em insights úteis, gerando relatórios informativos automaticamente."
      },
      {
        heading: "Tecnologias Utilizadas",
        image: { src: "img/opt/spacy-code.webp", fallback: "img/spacy-code.png", alt: "Código da classe AiModel do Spac-Y no GitHub" },
        text: "O projeto foi construído com Python e Flask, usando Pandas para processar os dados, Matplotlib e Seaborn para os gráficos e o Ollama para a IA que escreve o relatório. A arquitetura segue a Programação Orientada a Objetos: a classe Archive cuida da manipulação dos dados, a AiModel monta o prompt do assistente financeiro, e as rotas do Flask ficam limpas e fáceis de manter. A interface foi estilizada com Tailwind CSS."
      },
      {
        heading: "Considerações Finais",
        image: { src: "img/opt/spacy2.webp", fallback: "img/spacy2.png", alt: "Dashboard financeiro em PDF gerado pelo Spac-Y" },
        text: "Além de ser uma ferramenta útil no meu dia a dia para o controle de gastos, o projeto me permitiu revisitar conceitos importantes, como POO, e explorar novas abordagens de desenvolvimento e estilização. O relatório em PDF reúne os gráficos e as respostas da IA sobre os gastos do período. Ainda há muito para evoluir, mas os resultados até aqui têm me surpreendido bastante."
      }
    ],
    repo: "https://github.com/VitorCapeleti/PaymentsManagement",
    tags: ["IA", "Python", "Flask", "Ollama", "Pandas"]
  },
  {
    slug: "bankup",
    legacy: "bankUp.html",
    title: "BankUp",
    pageTitle: "BankUp",
    summary: "O projeto que faço parte, como desenvolvedor Back-End, e Scrum Master da minha equipe, que visa pagamento automático de contas. Com o objetivo de criar uma aplicação…",
    cover: { src: "img/opt/bankup1.webp", fallback: "img/bankup1.png", alt: "BankUp" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/bankup1.webp", fallback: "img/bankup1.png", alt: "Interface principal do BankUp" }, text: "O projeto que faço parte, como desenvolvedor Back-End, e Scrum Master da minha equipe, que visa pagamento automático de contas. Com o objetivo de criar uma aplicação de uma FINTECH que será um banco digital focado em automação de pagamentos de contas, com integração via Whatsapp e e-mail, garantindo praticidade para o usuário e notificações tanto para o cliente quanto para a pessoa cadastrada para pagar contas." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/bankup2.webp", fallback: "img/bankup2.png", alt: "Tecnologias usadas no BankUp" }, text: "Focando no desenvolvimento Back-end, meu e de minha equipe, as tecnologias foram JavaScript como linguagem de programação, NodeJS como servidor, PostgreSQL como base de dados, tecnologias de rotas e API rest, Docker para automação de dependências, Postman para confimação de APIs e GitHub para versionamento de projeto." },
      { heading: "Considerações Finais", image: { src: "img/opt/bankup3.webp", fallback: "img/bankup3.png", alt: "Resultados do BankUp" }, text: "Com o resultado parcial do projeto, com integração já com todas as outras equipes, de Front-End e Infraestrutura, esse projeto aprimorou minha habilidade como desenvolvedor, arquiteto e engenheiro de software, trabalhando sempre com padrões e técnicas já confirmadas pelo mercado. Além de contribuir para meu desenvolvimento em trabalho com equipe, no qual foi colocado como Scrum Master." },
    ],
    repo: "https://github.com/gitMasterAms/BankUp",
    tags: ["Profissional","JavaScript","Node.js","PostgreSQL","Docker","API REST"]
  },
  {
    slug: "abc-espessura",
    legacy: "variaEspAuto.html",
    title: "ABC - Espessura",
    pageTitle: "ABC - Otimização de Espessura",
    summary: "ABC - Otimização de Espessura é uma aplicação web interativa, em pesquisa com INPE, desenvolvida com Python (Flask) para otimizar…",
    cover: { src: "img/opt/auto1.webp", fallback: "img/auto1.png", alt: "ABC" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/auto1.webp", fallback: "img/auto1.png", alt: "Interface principal do ABC - Otimização de Espessura" }, text: "A aplicação aceita arquivos .csv com dados de permissividade (ε) e permeabilidade (μ), realiza simulações com diferentes algoritmos e apresenta os resultados de forma visual, intuitiva e com opção de exportação em PDF. A confirmação dos resultados foi feito com o software comercial FEKO(Fig 2)." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/auto2.webp", fallback: "img/auto2.png", alt: "Tecnologias usadas no ABC - Otimização de Espessura" }, text: "Python 3.x; Flask (web framework); NumPy (operações numéricas); Matplotlib (geração de gráficos); ReportLab (geração de PDF); HTML5 + CSS3 (interface); Base64 (visualização inline de imagens); Algoritmo da Colônia de Abelhas (ABC)." },
      { heading: "Considerações Finais", image: { src: "img/opt/auto3.webp", fallback: "img/auto3.png", alt: "Resultados do ABC - Otimização de Espessura" }, text: "Com o resultado do projeto, notei meu amadurecimento como programador, analista e desenvolvedor. Esse projeto foi um pacote completo de aplicabilidade de conceitos, como algoritmos, otimização, gestão de projetos e entre outros. Esse projeto, trouxe também, meu autodesenvolvimento na linguagem Python, onde superei diversos desafios durante minha trajetória." },
    ],
    repo: "https://github.com/VitorCapeleti/VariaEspessuraAuto",
    tags: ["Pesquisa","Python","Flask","NumPy","Matplotlib"]
  },
  {
    slug: "task-manager-api",
    legacy: "taskManegerApi.html",
    title: "Task Manager API",
    pageTitle: "Task Manager API",
    summary: "Este projeto é uma API para o gerenciamento de cadastros, listando usuários e com funcionalidades de criação, leitura, atualização e exclusão (CRUD)…",
    cover: { src: "img/opt/task1.webp", fallback: "img/task1.png", alt: "Task Manager" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/task1.webp", fallback: "img/task1.png", alt: "Interface finalidade" }, text: "Este projeto é uma API para o gerenciamento de cadastros, listando usuários e com funcionalidades de criação, leitura, atualização e exclusão (CRUD). Ele foi desenvolvido como parte de um projeto acadêmico para aplicar os conceitos de gestão ágil utilizando práticas do Lean." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/task2.webp", fallback: "img/task2.png", alt: "Tecnologias" }, text: "PHP: Linguagem de programação principal usada para criar a API. MySQL: Banco de dados para armazenar informações das tarefas. Bootstrap: Para estilização e componentes front-end simples. GitHub Projects e Issues: Ferramentas usadas para o gerenciamento do backlog. Kanban: Metodologia de organização com colunas." },
      { heading: "Considerações Finais", image: { src: "img/opt/task3.webp", fallback: "img/task3.png", alt: "Considerações" }, text: "Com o resultado final, desenvolvi minhas habilidades como programador, aplicando conceitos não só tecnológicos, mas também de gestão ágil, o que proporcionou um desenvolvimento veloz e eficiente, juntamente com os conceitos de CI/CD." },
    ],
    repo: "https://github.com/VitorCapeleti/task-manager-api",
    tags: ["API","PHP","MySQL","Bootstrap","Kanban"]
  },
  {
    slug: "atom",
    legacy: "atom.html",
    title: "ATOM",
    pageTitle: "Atom",
    summary: "A Atom foi um projeto acadêmico desenvolvido por mim e minha equipe durante a graduação. É uma plataforma que te permite publicar projetos…",
    cover: { src: "img/opt/Atom.webp", fallback: "img/Atom.png", alt: "Atom" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/Atom1.webp", fallback: "img/Atom1.png", alt: "Interface principal do Atom" }, text: "A Atom, foi um projeto acadêmico, desenvolvido por mim e minha equipe, durante a graduação. A Atom, é uma plataforma que te permite publicar todos os seus projetos, e ter controle de todos eles por meio de um repositório virtual. A Atom foi criada para suprir a falta de visibilidade, sobre ideias geniais de projetos/artigos científicos. A Atom ainda está em desenvolvimento e pussui elementos para serem melhorados, mas com a plataforma visamos auxiliar diversos alunos, pesquisadores e empresas interessadas a encontrarem novas ideias e consilidarem seus trabalhos realizados." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/Atom2.webp", fallback: "img/Atom2.png", alt: "Tecnologias usadas no Atom" }, text: "A Atom, foi desenvolvida utilizando diversas tecnologias, vou explicar como foi um pouco do processo de criação. Primeiramente, para o design da plataforma e como ficariam seus componentes, utilizamos o Figma e o Canva para auxiliar esta parte, partindo agora para o design na Web, utilizamos HTML, CSS e Javascript para tornar o site intuitivo e interativo. Na parte de banco de dados e manipulação de dados, utilizamos técnicas de banco de dados relacional, e a tecnologia utilizada para criar a base de dados foi o XAMPP junto com o MySql, para utilizarmos um servidor local na máquina, e na manipulação de dados, utilizamos PHP para tratar e armazenar esses dados." },
      { heading: "Considerações Finais", image: { src: "img/opt/Atom.webp", fallback: "img/Atom.png", alt: "Resultados do Atom" }, text: "Com as primeiras apresentações e testes da Atom, analisamos um grande interesse do público nessa área científica, principalmente a possibilidade de interagir e debater dentro dos posts, esperamos entregar ao final do projeto uma plataforma ainda mais consistente e que supere a expectativa do público." },
    ],
    repo: "https://github.com/VitorCapeleti/Atom",
    tags: ["Acadêmico","Figma","HTML/CSS","JavaScript","PHP","MySQL"]
  },
  {
    slug: "unitecs",
    legacy: "unitecs.html",
    title: "UNITEC'S",
    pageTitle: "Unitec's",
    summary: "A Unitec foi o meu projeto de conclusão de curso, uma rede social criada para contribuir no compartilhamento de conhecimento entre docentes e discentes, dos cursos presentes na…",
    cover: { src: "img/opt/Unitecs.webp", fallback: "img/Unitecs.png", alt: "Unitec's" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/Unitecs1.webp", fallback: "img/Unitecs1.png", alt: "Interface principal do Unitec's" }, text: "A Unitec's foi o meu projeto de conclusão de curso, uma rede social criada para contribuir no compartilhamento de conhecimento entre docentes e discentes, dos cursos presentes na instituição onde me formei. A plataforma tem o intuito de encurtar a relação entre os cursos técnicos presentes na instituição, contribuindo para maior disseminação de conhecimento. A plataforma conta com um perfil pessoal, para que o aluno ou professor, possam publicar seus estudos e metodologias de aprendizados." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/Unitecs.webp", fallback: "img/Unitecs.png", alt: "Tecnologias usadas no Unitec's" }, text: "A Unitec's foi uma plataforma desenvolvida por divesas tecnologias, que contribuiram para o resultado final. Para o design inicial utilizamos o Figma e o Canva para definir os componentes e como seriam alinhados, para o design na Web utilizamos HTML, CSS e Javascript, com intuito de trazer interatividade, fluidez e funcionalidade para o site. Na parte da base e manipulação de dados utilizamos o XAMPP e o MySql, para criar toda a estrutura do banco de dados e poder hospeda-lo em servidor local, já para a manipulação, tratamento e segurança de dados utilizamos o PHP como linguagem de programação." },
      { heading: "Considerações Finais", image: { src: "img/opt/Unitecs2.webp", fallback: "img/Unitecs2.png", alt: "Resultados do Unitec's" }, text: "Com todas as apresentações e demonstrações da funcionalidade da Unitec's, consguimos um feedback maravilhoso sobre o projeto. O projeto conseguiu atingir todas as expectativas do público alvo e inovou dentro do ambiente acadêmico a maneira de disseminar o conhecimento. Além de ajudar diversos alunos a encontrarem em outras áreas técnicas sua verdadeira vocação." },
    ],
    repo: "https://github.com/VitorCapeleti/TCC",
    tags: ["Acadêmico","Figma","HTML/CSS","JavaScript","PHP","MySQL"]
  },
  {
    slug: "dsmusic",
    legacy: "dsmusic.html",
    title: "DSMUSIC",
    pageTitle: "DSmusic",
    summary: "DSmusic foi um projeto acadêmico de minha autoria, desenvolvido com o intuito de ser um programa de música, onde o usuário pode navegar pelo site e escutar suas músicas, o site também…",
    cover: { src: "img/opt/dsmusic.webp", fallback: "img/dsmusic.png", alt: "DSmusic" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/dsmusic1.webp", fallback: "img/dsmusic1.png", alt: "Interface principal do DSmusic" }, text: "DSmusic foi um projeto acadêmico de minha autoria, desenvolvido com o intuito de ser um programa de música, onde o usuário pode navegar pelo site e escutar suas músicas, o site também conta com a parte de planos de música, onde o usuário pode escolher qual plano se encaixa mais com ele, de acordo com a finalidade que esteja buscando, todos os valores apresentados são fictícios e apenas servem como ilustração. Além disso, o site conta com a parte de feedback, caso o usuário necessite de algum suporte." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/dsmusic.webp", fallback: "img/dsmusic.png", alt: "Tecnologias usadas no DSmusic" }, text: "O projeto do DSmusic, foi criado com diversas tecnologias, que contribuiram para gerar o resultado final. para o design inicial dos componentes foi utilizado o Canva, já para o design da Web, foi utilizado HTML e CSS para estilização e composição dos elementos do site. Além disso, a parte de criação de banco de dados e manipulação dos dados foi desenvolvida pelo XAMPP utilizando MySql para criar a base de dados e o servidor local, já a manipulação de dados, foi realizada utilizando PHP como linguagem programação." },
      { heading: "Considerações Finais", image: { src: "img/opt/dsmusic3.webp", fallback: "img/dsmusic3.png", alt: "Resultados do DSmusic" }, text: "Com o resultado final, o trabalho desenvolvido alcançou o que era esperado de início. Além disso, o projeto contribuiu para o meu autoaprendizado e forleceu minhas habilidade como Desenvolvedor Web, Front-End e Back-End." },
    ],
    repo: null,
    tags: ["Acadêmico","Canva","HTML/CSS","PHP","MySQL"]
  },
  {
    slug: "nlw",
    legacy: "nlw.html",
    title: "NLW",
    pageTitle: "Nlw",
    summary: "A Nlw, foi um projeto desenvolvido durante um evento de programação, esse site funciona como uma lista pessoal, possibilitando o usuário que densenvolveu o site, crie tópicos de…",
    cover: { src: "img/opt/nlw.webp", fallback: "img/nlw.png", alt: "Nlw" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/nlw.webp", fallback: "img/nlw.png", alt: "Interface principal do Nlw" }, text: "A Nlw, foi um projeto desenvolvido durante um evento de programação, esse site funciona como uma lista pessoal, possibilitando o usuário que densenvolveu o site, crie tópicos de jogos, estreamers, entre outros. Esse site tem a funcionalidade de expor seus hobbies favoritos, principalmente os realizados dentro da internet, como seus jogos favoritos, por exemplo." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/nlw1.webp", fallback: "img/nlw1.png", alt: "Tecnologias usadas no Nlw" }, text: "O projeto da Nlw, foi desenvolvido apenas com design. Para o design dos componentes e como seriam colocados dentro do site, foi utilizado o Figma, já o design Web foi desenvolvido com HTML e CSS, utilizando diversos elementos de estilização e animação dentro do próprio CSS." },
      { heading: "Considerações Finais", image: { src: "img/opt/nlw2.webp", fallback: "img/nlw2.png", alt: "Resultados do Nlw" }, text: "Com o resultado final, consegui desenvolver mais minhas habilidades de Desenvolvedor Web e aprimorar meu conhecimento sobre algumas técnicas. O projeto, também serviu como ideia de design para novos projetos posteriores." },
    ],
    repo: "https://github.com/VitorCapeleti/nlw",
    tags: ["Web","Figma","HTML/CSS"]
  },
  {
    slug: "ballebot",
    legacy: "ballebot.html",
    title: "BALLE BOT",
    pageTitle: "Balle Bot",
    summary: "A Balle Bot foi um projeto desenvolvido pelo YouTube, esse é um site utilizado para exibir um produto, que é a própria Balle Bot, sua ideia é mostrar as principais funcinalidades…",
    cover: { src: "img/opt/BalleBot.webp", fallback: "img/BalleBot.png", alt: "BalleBot" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/BalleBot.webp", fallback: "img/BalleBot.png", alt: "Interface principal do Balle Bot" }, text: "A Balle Bot foi um projeto desenvolvido pelo YouTube, esse é um site utilizado para exibir um produto, que é a própria Balle Bot, sua ideia é mostrar as principais funcinalidades do produto e dar a possibilidade de você conhecê-lo." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/BalleBot1.webp", fallback: "img/BalleBot1.png", alt: "Tecnologias usadas no Balle Bot" }, text: "Para a criação do site da Balle Bot, foi necessário apenas o design. Para a parte design de componentes foi utilizado o Figma, para que fosse possível deixar alinhado todos os elementos e onde eles serião colocados, já na parte do design Web, foi utilizado HTML e CSS, para estilização dos componentes e interatividade com alguns elementos do site." },
      { heading: "Considerações Finais", image: { src: "img/opt/BalleBot2.webp", fallback: "img/BalleBot2.png", alt: "Resultados do Balle Bot" }, text: "Com o resultado final, o projeto contribuiu com meu aprendizado de design para a Web, e fortaleceu meu conhecimento de estilização e estruturação de site. Servindo de inspiração para outros layouts criados." },
    ],
    repo: null,
    tags: ["Web","Figma","HTML/CSS"]
  },
  {
    slug: "sounds",
    legacy: "sounds.html",
    title: "SOUND'S",
    pageTitle: "Sound's",
    summary: "Sound's foi um projeto de minha autoria, projetado para servir como uma loja de fones de ouvido, o projeto conta com um início anunciando um novo produto, logo depois aparecem alguns…",
    cover: { src: "img/opt/sounds.webp", fallback: "img/sounds.png", alt: "Sounds" },
    sections: [
      { heading: "Finalidade do Projeto", image: { src: "img/opt/sounds.webp", fallback: "img/sounds.png", alt: "Interface principal do Sound's" }, text: "Sound's foi um projeto de minha autoria, projetado para servir como uma loja de fones de ouvido, o projeto conta com um início anunciando um novo produto, logo depois aparecem alguns produtos da loja, todos os preços e produtos são fictícios e servem apenas como ilustração, por último é breve comentário explicando sobre a empresa, meios de contato e outras mídias." },
      { heading: "Tecnologias Utilizadas", image: { src: "img/opt/sounds1.webp", fallback: "img/sounds1.png", alt: "Tecnologias usadas no Sound's" }, text: "Para a criação do site da Sound's, apenas o design foi necessário. Para o design de componentes e estilo, foi utilizado o Canva e o Figma em conjunto, para que fosse possível desenvolver os elementos gráficos junto com o layout, já para o design na Web, foi utilizado HTML e CSS, para estruturar e estilizar todos os elementos dentro do site, e dar interatividade a alguns elementos." },
      { heading: "Considerações Finais", image: { src: "img/opt/sounds3.webp", fallback: "img/sounds3.png", alt: "Resultados do Sound's" }, text: "Com o resultado final, o site atendeu o design programado no início, e serve como possibilidade para empresas que querem anunciar seus produtos de forma dinâmica, visual e interativa com o usuário. Além disso, o site contribuiu para o meu autodesenvolvimento como desenvolvedor Web e Front-End." },
    ],
    repo: null,
    tags: ["Web","Canva","Figma","HTML/CSS"]
  },
];
window.PROJECT_CATEGORIES = ["Web","API","Pesquisa","Acadêmico","Profissional","IA"];
window.PROJECT_TAGS = ["Web","API","Pesquisa","Acadêmico","Profissional","IA","API REST","Bootstrap","Canva","Claude Code","Docker","Figma","Flask","HTML/CSS","JavaScript","Kanban","Matplotlib","MySQL","Node.js","NumPy","Ollama","Pandas","PHP","PostgreSQL","Python","TypeScript"];
