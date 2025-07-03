import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, X, ShoppingCart, Utensils, Loader2, Bike, AlertCircle, Search, MapPin, CheckCircle } from 'lucide-react';

// --- CONFIGURAÇÃO ---
const AIRTABLE_BASE_ID = 'appp2kokMMFlzbk0y'; 
const AIRTABLE_PRODUCTS_TABLE_NAME = 'Produtos';
const AIRTABLE_FEES_TABLE_NAME = 'Taxas';
const AIRTABLE_TOKEN = 'patsmPSpjBMBujDIc.f051cddbfd1f1f1d7a0c51b50d0b4dcd698c0adba6cc9d137046151c178397ef';
const WHATSAPP_NUMBER = '5599981092517';

// --- Componente Principal ---
export default function App() {
    const [products, setProducts] = useState([]);
    const [deliveryFees, setDeliveryFees] = useState([]);
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [location, setLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            const fetchAllAirtableRecords = async (tableName) => {
                let allRecords = [];
                let offset = null;
                const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);

                do {
                    if (offset) url.searchParams.set('offset', offset);
                    const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
                    if (!response.ok) {
                        const errorData = await response.json();
                        if (response.status === 401 || response.status === 403) throw new Error(`Autenticação falhou. Verifique seu Token e permissões.`);
                        throw new Error(`Erro ao buscar dados da tabela "${tableName}": ${errorData.error.message || response.statusText}`);
                    }
                    const page = await response.json();
                    allRecords.push(...page.records);
                    offset = page.offset;
                } while (offset);

                return allRecords;
            };

            try {
                const [productsRecords, feesRecords] = await Promise.all([
                    fetchAllAirtableRecords(AIRTABLE_PRODUCTS_TABLE_NAME),
                    fetchAllAirtableRecords(AIRTABLE_FEES_TABLE_NAME)
                ]);

                const formattedProducts = productsRecords
                    .filter(r => r.fields.Nome && typeof r.fields.Preco !== 'undefined' && r.fields.Disponivel === true)
                    .map(r => ({ id: r.id, name: r.fields.Nome, price: r.fields.Preco, image: r.fields.ImagemURL ? r.fields.ImagemURL[0].url : null }));
                setProducts(formattedProducts);

                const formattedFees = feesRecords
                    .filter(r => r.fields.Bairro && typeof r.fields.Taxa !== 'undefined')
                    .map(r => ({ id: r.id, neighborhood: r.fields.Bairro, fee: r.fields.Taxa }))
                    .sort((a, b) => a.neighborhood.localeCompare(b.neighborhood)); 
                
                setDeliveryFees(formattedFees);
                // Abre o modal de localização depois que tudo carregar
                setIsLocationModalOpen(true);

            } catch (err) {
                console.error("Falha ao buscar dados do Airtable:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            showToast("Geolocalização não é suportada por este navegador.", 'error');
            return;
        }
    
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                setLocationStatus('success');
                setIsLocationModalOpen(false); // Fecha o modal após o sucesso
                showToast("Localização capturada com sucesso!", 'success');
            },
            (error) => {
                setLocationStatus('error');
                setLocation(null);
                let msg = "Não foi possível obter a localização. Verifique as permissões do seu navegador.";
                if (error.code === 1) msg = "Acesso à localização negado. Por favor, habilite nas configurações do seu navegador.";
                showToast(msg, 'error');
            }
        );
    };

    const addToCart = (product) => { setCart(prev => { const i = prev.find(item => item.id === product.id); if (i) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item); return [...prev, { ...product, quantity: 1 }]; }); showToast(`${product.name} adicionado!`); };
    const updateCartQuantity = (id, amount) => { setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0)); };
    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
            <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20">
                <nav className="container mx-auto px-4 py-3 flex justify-between items-center"><div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center"><Utensils className="mr-2" /><span>Seu Delivery</span></div><button onClick={openCart} className="relative"><ShoppingCart />{cart.length > 0 && (<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{cart.reduce((a, i) => a + i.quantity, 0)}</span>)}</button></nav>
            </header>
            <main className="container mx-auto p-4">
                <h1 className="text-3xl font-bold mb-6 text-center">Nosso Cardápio</h1>
                {isLoading ? (<div className="flex justify-center items-center p-10"><Loader2 className="animate-spin h-10 w-10 text-indigo-500" /><span className="ml-4 text-lg">Carregando dados...</span></div>) 
                : error ? (<div className="text-center p-10 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg"><strong className="font-bold">Ocorreu um erro!</strong><span className="block sm:inline ml-2">{error}</span></div>) 
                : products.length === 0 ? (<div className="text-center p-10"><p className="text-lg text-gray-500">Nenhum produto disponível.</p><p className="text-sm text-gray-400 mt-2">Verifique se há produtos na tabela 'Produtos' do Airtable.</p></div>) 
                : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{products.map(p => (<ProductCard key={p.id} product={p} onAddToCart={addToCart} />))}</div>)}
            </main>
            <CartModal isOpen={isCartOpen} onClose={closeCart} cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} whatsappNumber={WHATSAPP_NUMBER} deliveryFees={deliveryFees} onShowToast={showToast} location={location} locationStatus={locationStatus} onGetLocation={handleGetLocation} />
            <LocationRequestModal isOpen={isLocationModalOpen && !isLoading} onGetLocation={handleGetLocation} onClose={() => setIsLocationModalOpen(false)} locationStatus={locationStatus} />
            {toast.show && (<div className={`fixed bottom-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg z-50 flex items-center ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}><AlertCircle className="mr-3" />{toast.message}</div>)}
        </div>
    );
}

function ProductCard({ product, onAddToCart }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform"><img src={product.image || 'https://placehold.co/400x300/CCCCCC/FFFFFF?text=Sem+Imagem'} alt={product.name} className="w-full h-48 object-cover" /><div className="p-4 flex flex-col flex-grow"><h3 className="text-lg font-semibold flex-grow">{product.name}</h3><p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><button onClick={() => onAddToCart(product)} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Adicionar</button></div></div>
    );
}

function LocationRequestModal({ isOpen, onClose, onGetLocation, locationStatus }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-center p-8">
                <MapPin size={48} className="mx-auto text-indigo-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Bem-vindo(a)!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Para calcularmos a taxa de entrega e agilizar seu pedido, precisamos da sua localização.</p>
                <button onClick={onGetLocation} disabled={locationStatus === 'loading'} className="w-full p-3 text-white rounded-md flex items-center justify-center transition-colors bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400">
                    {locationStatus === 'loading' ? <Loader2 className="animate-spin mr-2" /> : <MapPin className="mr-2"/>}
                    Permitir Localização
                </button>
                <button onClick={onClose} className="mt-2 text-sm text-gray-500 hover:underline">Agora não</button>
            </div>
        </div>
    );
}

function CartModal({ isOpen, onClose, cart, onUpdateQuantity, onRemove, whatsappNumber, deliveryFees, onShowToast, location, locationStatus, onGetLocation }) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Pix');
    const [changeFor, setChangeFor] = useState('');
    const [selectedFee, setSelectedFee] = useState(0);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
    
    const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef(null);

    const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
    const total = subtotal + selectedFee;

    const filteredNeighborhoods = useMemo(() => {
        if (!neighborhoodSearch) return deliveryFees;
        return deliveryFees.filter(f => f.neighborhood.toLowerCase().includes(neighborhoodSearch.toLowerCase()));
    }, [neighborhoodSearch, deliveryFees]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) setIsDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleSelectNeighborhood = (fee) => {
        setSelectedFee(fee.fee);
        setSelectedNeighborhood(fee.neighborhood);
        setNeighborhoodSearch(fee.neighborhood);
        setIsDropdownOpen(false);
    };

    const handleSendOrder = () => {
        if (cart.length === 0) return onShowToast("Seu carrinho está vazio.", 'error');
        if (!name.trim()) return onShowToast("Por favor, preencha seu nome.", 'error');
        if (!address.trim()) return onShowToast("Por favor, preencha seu endereço.", 'error');
        if (!location) return onShowToast("Por favor, capture sua localização GPS.", 'error');
        if (!selectedNeighborhood) return onShowToast("Por favor, selecione seu bairro.", 'error');

        const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        let message = `*NOVO PEDIDO* 🛍️\n\n*Cliente:* ${name}\n*Endereço:* ${address}\n*Bairro:* ${selectedNeighborhood}\n*Localização GPS:* ${mapsLink}\n\n*Itens do Pedido:*\n`;
        cart.forEach(item => { message += `▪️ ${item.quantity}x ${item.name} - ${Number(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`; });
        message += `\n*Subtotal:* ${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n*Taxa de Entrega:* ${selectedFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n*Total:* *${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n\n*Forma de Pagamento:* ${paymentMethod}\n`;
        if (paymentMethod === 'Dinheiro' && changeFor) message += `*Troco para:* ${changeFor}\n`;
        message += `\nObrigado!`;

        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex-shrink-0"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Seu Pedido</h2><button onClick={onClose}><X size={24} /></button></div></div>
                
                <div className="flex-grow overflow-y-auto p-4">
                    {cart.length === 0 ? <p className="text-center py-8">Seu carrinho está vazio.</p> : (
                        <>
                            <div className="space-y-4 mb-6">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center space-x-3"><img src={item.image || 'https://placehold.co/100x100/CCCCCC/FFFFFF?text=Img'} alt={item.name} className="w-16 h-16 object-cover rounded-md"/><div><p className="font-semibold">{item.name}</p><p className="text-sm text-gray-500">{Number(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div></div>
                                        <div className="flex items-center space-x-2"><button onClick={() => updateCartQuantity(item.id, -1)} className="bg-gray-200 dark:bg-gray-600 h-7 w-7 rounded-full">-</button><span>{item.quantity}</span><button onClick={() => updateCartQuantity(item.id, 1)} className="bg-gray-200 dark:bg-gray-600 h-7 w-7 rounded-full">+</button><button onClick={() => removeFromCart(item.id)} className="ml-2 text-red-500"><Trash2 size={18} /></button></div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4 pt-4 border-t border-dashed">
                                 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md border focus:ring-2 focus:ring-indigo-500" required />
                                 <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Seu endereço (Rua, N°, Referência)" className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md border focus:ring-2 focus:ring-indigo-500" required />
                                 
                                 <div className="relative" ref={searchRef}>
                                     <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-5 w-5 text-gray-400" /></span><input type="text" value={neighborhoodSearch} onChange={(e) => {setNeighborhoodSearch(e.target.value); setIsDropdownOpen(true);}} onFocus={() => setIsDropdownOpen(true)} placeholder="Digite para buscar seu bairro" className="w-full p-3 pl-10 bg-gray-100 dark:bg-gray-700 rounded-md border focus:ring-2 focus:ring-indigo-500"/></div>
                                     {isDropdownOpen && (<ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">{filteredNeighborhoods.length > 0 ? filteredNeighborhoods.map(f => (<li key={f.id} onClick={() => handleSelectNeighborhood(f)} className="px-4 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-600 cursor-pointer">{f.neighborhood} {f.fee > 0 ? `(+ ${f.fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` : ''}</li>)) : <li className="px-4 py-2 text-gray-500">Nenhum bairro encontrado</li>}</ul>)}
                                 </div>
                                 
                                 <div>
                                    <button type="button" onClick={onGetLocation} disabled={locationStatus === 'loading'} className={`w-full p-3 text-white rounded-md flex items-center justify-center transition-colors ${locationStatus === 'success' ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'} disabled:bg-gray-400`}>
                                        {locationStatus === 'loading' && <Loader2 className="animate-spin mr-2" />}
                                        {locationStatus !== 'loading' && <MapPin className="mr-2"/>}
                                        {locationStatus === 'idle' && 'Pegar Localização GPS'}
                                        {locationStatus === 'loading' && 'Carregando...'}
                                        {locationStatus === 'success' && 'Localização Capturada!'}
                                        {locationStatus === 'error' && 'Tentar Novamente'}
                                    </button>
                                    <div className="text-xs text-center mt-2 h-4">
                                        {locationStatus === 'success' && <p className="text-green-600 font-semibold flex items-center justify-center"><CheckCircle size={14} className="mr-1"/>Tudo certo!</p>}
                                        {locationStatus === 'error' && <p className="text-red-600 font-semibold">Acesso negado. Verifique as permissões do site na barra de endereço.</p>}
                                    </div>
                                 </div>

                                 <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md border focus:ring-2 focus:ring-indigo-500">
                                     <option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option>
                                 </select>
                                 {paymentMethod === 'Dinheiro' && <input type="text" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="Precisa de troco para quanto?" className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md border focus:ring-2 focus:ring-indigo-500" />}
                            </div>
                        </>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-4 border-t flex-shrink-0 bg-white dark:bg-gray-800">
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500 flex items-center"><Bike size={16} className="mr-2"/>Taxa de Entrega</span><span>{selectedFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2 border-dashed"><span>Total</span><span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        </div>
                        <button onClick={handleSendOrder} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center text-lg"><ShoppingCart className="mr-3" /> Enviar Pedido</button>
                    </div>
                )}
            </div>
        </div>
    );
}
