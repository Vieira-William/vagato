import { useState, useEffect } from 'react';
import { User, Check, Camera, X, Info, Upload } from 'lucide-react';

const AVATARES_PREDEFINIDOS = [
    { id: 1, name: 'Aura Nebula', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&q=80' },
    { id: 2, name: 'Glass Prism', url: 'https://images.unsplash.com/photo-1635339001026-6d6ef9dd4a9e?w=600&q=80' },
    { id: 3, name: 'Cyber Ring', url: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?w=600&q=80' },
    { id: 4, name: 'Organic Flow', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&q=80' },
    { id: 5, name: 'Matte Geometry', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80' },
    { id: 6, name: 'Digital Sunset', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&q=80' },
    { id: 7, name: 'Bauhaus Grid', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=600&q=80' },
    { id: 8, name: 'Iridescent Liquid', url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=600&q=80' },
    { id: 9, name: 'Ghost Profile', url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=600&q=80' },
];

export default function UserProfileCard({ user, onAvatarChange }) {
    const [showGallery, setShowGallery] = useState(false);
    const [showInfoTooltip, setShowInfoTooltip] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(() => {
        const saved = localStorage.getItem('vagas_user_avatar');
        return saved || user?.avatar || AVATARES_PREDEFINIDOS[0].url;
    });

    useEffect(() => {
        localStorage.setItem('vagas_user_avatar', selectedAvatar);
    }, [selectedAvatar]);

    const handleSelect = (url) => {
        setSelectedAvatar(url);
        onAvatarChange?.(url);
        setShowGallery(false);
    };

    return (
        <div className="relative w-full h-full rounded-[32px] overflow-hidden group shadow-soft border border-white/40 flex flex-col bg-white">

            {/* Bloco de Imagem com Hover de Câmera e Dica Profissional (Alto Contraste) */}
            <div className="relative flex-1 cursor-pointer overflow-hidden" onClick={() => setShowGallery(true)}>
                <img
                    src={selectedAvatar}
                    alt="User Profile"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay de Edição (Design UI/UX Refinado - Muito Escuro p/ Contraste) */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white z-20 p-6">
                    <div className="bg-white/20 p-3 rounded-full mb-3 border border-white/30 backdrop-blur-sm">
                        <Camera className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-bold tracking-widest uppercase mb-1 text-white">Mudar Avatar</span>
                    <p className="text-[9px] font-medium text-white/90 text-center max-w-[150px] leading-tight">
                        Seu cartão de visitas oficial. Transmita autoridade.
                    </p>
                </div>
            </div>

            {/* Glass Box Inferior (Design limpo sobre a imagem) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none z-10">
                <h2 className="text-white text-3xl font-light tracking-tighter leading-tight drop-shadow-md">
                    {user?.nome || 'William Marangon'}
                </h2>
                <p className="text-white/90 text-[13px] font-medium tracking-wide mt-1">
                    {user?.profissao || 'Senior UX/UI Specialist'}
                </p>
            </div>

            {/* Modal de Galeria (Versão V4 - Fundo Branco Sólido, Alto Contraste, Sem Glass exagerado) */}
            {showGallery && (
                <div className="absolute inset-0 z-30 bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden shadow-2xl rounded-[32px]">

                    {/* Header Compacto (Fixo, Branco Sólido para eliminar roxo) */}
                    <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-gray-100 bg-white relative z-40">
                        <div className="flex items-center gap-2">
                            <h3 className="text-black text-[10px] font-black uppercase tracking-widest leading-none">Avatar</h3>

                            {/* Dica Corporativa via Custom Tooltip (Apenas Mouse Enter) */}
                            <div className="relative">
                                <button
                                    onMouseEnter={() => setShowInfoTooltip(true)}
                                    onMouseLeave={() => setShowInfoTooltip(false)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <Info className="w-4 h-4 text-[#375DFB]" strokeWidth={3} />
                                </button>

                                {showInfoTooltip && (
                                    <div className="absolute left-0 top-full mt-2 w-[220px] bg-[#1A1A1E] text-white p-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                                        <p className="text-[10px] font-medium leading-relaxed">
                                            <span className="text-[#375DFB] font-bold">FOTO CORPORATIVA:</span> Escolha uma imagem que represente seu profissionalismo. Fotos manuais são as oficiais.
                                        </p>
                                        <div className="absolute -top-1 left-3 w-2 h-2 bg-[#1A1A1E] rotate-45" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Botão de Upload Minimalista (Sólido para Contraste) */}
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#375DFB] hover:bg-[#2a4ad9] text-white rounded-full transition-all active:scale-95 shadow-sm"
                            >
                                <Upload className="w-3 h-3" strokeWidth={3} />
                                <span className="text-[9px] font-extrabold uppercase tracking-tighter">Upload</span>
                            </button>

                            <button onClick={() => setShowGallery(false)} className="text-black/40 hover:text-black transition-colors p-1">
                                <X className="w-5 h-5" strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Área de Seleção (Scrollable) */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide bg-white">
                        {/* Aviso de Visibilidade (Fundo Sólido, Alto Contraste) */}
                        <div className="mb-5 flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={2.5} />
                            <p className="text-[10px] text-black leading-tight font-bold">
                                Imagens conceituais são ilustrativas e <span className="underline decoration-amber-500">não serão enviadas</span> para recrutadores. Use o Upload para processos oficiais.
                            </p>
                        </div>

                        <h4 className="text-black/50 text-[9px] font-black uppercase tracking-widest mb-4">Galeria Conceitual</h4>

                        {/* Grade de Avatares */}
                        <div className="grid grid-cols-3 gap-4 pb-4">
                            {AVATARES_PREDEFINIDOS.map((avatar) => (
                                <button
                                    key={avatar.id}
                                    onClick={() => handleSelect(avatar.url)}
                                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all active:scale-95 hover:shadow-lg ${selectedAvatar === avatar.url ? 'border-[#375DFB] border-[3px] p-0.5 shadow-md' : 'border-gray-100 hover:border-gray-300'
                                        }`}
                                >
                                    <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover rounded-[14px]" />
                                    {selectedAvatar === avatar.url && (
                                        <div className="absolute top-1.5 right-1.5 bg-[#375DFB] rounded-full p-0.5 shadow-sm">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
