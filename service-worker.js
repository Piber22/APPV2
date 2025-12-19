// ============================================
// SERVICE WORKER - DOCE GESTÃO
// Corrigido para ignorar recursos externos com CORS
// ============================================

const CACHE_NAME = 'doce-gestao-v1';

// Recursos para cachear (apenas recursos locais e CDNs seguros)
const RESOURCES_TO_CACHE = [
    '/',
    '/index.html',
    '/cardapio.html',
    '/orcamento.html',
    '/styles.css',
    '/cardapio-styles.css',
    '/orcamento-styles.css',
    '/cardapio-script.js',
    '/orcamento-firebase.js',
    '/orcamento-script.js',
    // Fontes do Google (geralmente funcionam bem)
    'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Pacifico&display=swap',
    // Font Awesome
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ============================================
// INSTALAÇÃO
// ============================================

self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Instalando...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Cache aberto');

                // Cachear recursos um por um para evitar falha total
                return Promise.allSettled(
                    RESOURCES_TO_CACHE.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`⚠️ Não foi possível cachear: ${url}`, err.message);
                            return Promise.resolve(); // Continuar mesmo se falhar
                        });
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker instalado com sucesso');
                return self.skipWaiting(); // Ativar imediatamente
            })
            .catch((error) => {
                console.error('❌ Erro ao instalar Service Worker:', error);
            })
    );
});

// ============================================
// ATIVAÇÃO
// ============================================

self.addEventListener('activate', (event) => {
    console.log('⚡ Service Worker: Ativando...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Remover caches antigos
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker ativado');
            return self.clients.claim(); // Controlar todas as páginas imediatamente
        })
    );
});

// ============================================
// FETCH - ESTRATÉGIA NETWORK FIRST
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições não-HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }

    // Ignorar recursos externos problemáticos (como transparenttextures.com)
    const blockedDomains = [
        'transparenttextures.com',
        'unsplash.com'
    ];

    if (blockedDomains.some(domain => url.hostname.includes(domain))) {
        // Deixar o navegador lidar com isso sem cache
        return;
    }

    // Estratégia: Network First, fallback para Cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Se a resposta for válida, clonar e cachear
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache).catch(err => {
                            // Ignorar erros de cache silenciosamente
                        });
                    });
                }

                return response;
            })
            .catch(() => {
                // Se falhar, tentar buscar do cache
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Se não houver cache, retornar página offline (opcional)
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }

                    return new Response('Recurso não disponível offline', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
                });
            })
    );
});

// ============================================
// MENSAGENS
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('🗑️ Cache limpo');
            })
        );
    }
});

console.log('✅ Service Worker carregado');