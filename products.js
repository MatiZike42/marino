import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/doissrwhj/image/upload";
const CLOUDINARY_PRESET = "marino_preset";

// Product Data Management
const ITEMS_PER_PAGE = 24;
let productsData = [];
let currentPage = 1;
let currentSearch = '';

// Filter States
let selectedCategories = new Set();
let selectedProviders = new Set();
let selectedColors = new Set();

// Quantity state per product card (module-level so it persists across renders)
const cardQtyMap = new Map();

// Check if admin to show controls
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

// Basic initial data (Official Mariño Catalog extracted from images)
const defaultProducts = [
    // DURLOCK - Placas de Yeso
    { id: "dur_placa_std", name: "Placa Estándar - STD", desc: "Placa de yeso para cielorrasos y revestimientos interiores.", category: "Placas de Yeso", provider: "Durlock", variants: ["12.5mm x 2.40m", "12.5mm x 2.60m", "12.5mm x 3.00m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774386363/f3ywjy8gwsn9vj0rtp2g.png", variantImgs: {"12.5mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774386366/poh3wbestfhaoich75ys.png", "12.5mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774386368/ldxqigzzhz0kdssgc8dl.png", "12.5mm x 3.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774386370/fzrqajvspmtaudtnaoga.png"} },
    { id: "dur_placa_rh", name: "Placa Resistente a la Humedad - RH", desc: "Ideal para baños, cocinas y ambientes húmedos.", category: "Placas de Yeso", provider: "Durlock", variants: ["12.5mm x 2.40m", "12.5mm x 2.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774386372/horrdjucobl38pmpg83u.png", variantImgs: {"12.5mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774386375/iy82pjjru9br6db8jmb2.png", "12.5mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774386377/jokohss69sgmc4whpqdf.png"} },
    { id: "dur_placa_rf", name: "Placa Resistente al Fuego - RF", desc: "Mayor resistencia al fuego para sectores críticos.", category: "Placas de Yeso", provider: "Durlock", variants: ["12.5mm x 2.40m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774386379/z7jrqua7t67x9za3jmrm.png", variantImgs: {"12.5mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774386381/tniyz9x1sdd0mjx4rl2d.png"} },
    { id: "dur_placa_técnica", name: "Placas Técnicas Durlock", desc: "Placas especiales para aislamiento, acústica e impactos.", category: "Placas de Yeso", provider: "Durlock", variants: ["ACU 60", "Antihumedad AH", "Extra Resistente ER", "Cuatro Dimensiones 4D", "Semicubiertos SC", "Aquaboard"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391701/nvnwrsjgshmbuccezxbx.png", variantImgs: {"ACU 60": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391705/a17f5wzcfqhdldjh5i6s.png", "Antihumedad AH": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391712/g2b5qyt3wtgpvqrr21fb.png", "Extra Resistente ER": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391715/sno0gdi7oc806o01nekn.png", "Cuatro Dimensiones 4D": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391717/muo6pml5kpn0wqtfjujd.png", "Semicubiertos SC": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391720/zhiusn6b4shxpgwaoa2j.png", "Aquaboard": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391722/zxr2ozl72g5zypot0jau.png"} },
    { id: "dur_placa_ciel", name: "Placa Ciel - 7mm", desc: "Placa ultra delgada para cielorrasos y curvas.", category: "Placas de Yeso", provider: "Durlock", variants: ["1.20 x 2.40m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391724/ybckcasp4traatnoy7mv.png", variantImgs: {"1.20 x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391726/qvot1b2pw5rz4tt7f6n0.png"} },
    
    // DURLOCK - Cementicia y Decorativa
    { id: "dur_siding", name: "Siding Durlock", desc: "Tablas de cemento para revestimiento exterior imitación madera.", category: "Cementicia", provider: "Durlock", variants: ["8mm x 0.20 x 3.66"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391729/p1acbtbf9ro1b35qofxs.png", variantImgs: {"8mm x 0.20 x 3.66": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391731/xlxo4rwoh2toznrhne0u.png"} },
    { id: "dur_superboard", name: "Superboard", desc: "Placa de cemento autoclavada estructural.", category: "Cementicia", provider: "Durlock", variants: ["6mm x 2.40m", "8mm x 2.40m", "10mm x 2.40m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391733/rwgydvefloauahbo5h9l.png", variantImgs: {"6mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391735/q7cl2g434rkbmx1tfmn4.png", "8mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391737/nqektktvx6u78sjiudkv.png", "10mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391739/bsq2tt3r5bw9zsn1n4yt.png"} },
    { id: "dur_simplisima", name: "Simplísima", desc: "Placa decorativa con acabados premium.", category: "Simplísima", provider: "Durlock", variants: ["Mármol Traviatta", "Madera Veteada", "Madera Entablonada", "Piedra Azteca"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391741/w4jzspy81kkopwa1qez1.png", variantImgs: {"Mármol Traviatta": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391744/cc851er5j5t5ggzw7jo2.png", "Madera Veteada": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391746/d0um6sfplah5cuat7a3n.png", "Madera Entablonada": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391749/v9ld3kqtxqvcc18fv2v0.png", "Piedra Azteca": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391751/thd8x4nglqdcreq92w6a.png"} },
    { id: "dur_deco_vinyl", name: "Placa Deco Vinyl", desc: "Placa de yeso revestida en vinilo para cielorrasos desmontables.", category: "Deco Vinyl", provider: "Durlock", variants: ["0.60 x 0.60m", "1.20 x 0.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391753/c3ntzzotrqyeqy2czv9s.jpg", variantImgs: {"0.60 x 0.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391755/tp7r7bcogux01my7l0kw.jpg", "1.20 x 0.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391758/k3pw5n8pighgck3cz9yr.jpg"} },
    
    // DURLOCK - Masillas y Lana
    { id: "dur_masilla_lpu", name: "Masilla LPU Durlock", desc: "Masilla lista para usar de secado rápido.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["7kg", "18kg", "32kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391760/kd1lmagsu72hh7ogmpyy.jpg", variantImgs: {"7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391762/rmzsz0gxelsuwlfimnd4.jpg", "18kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391764/khjm3ahdvhjcoaixh6tk.jpg", "32kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391766/pgv4ci2xe2peqglykkze.jpg"} },
    { id: "dur_masilla_sr", name: "Masilla SR 30min", desc: "Masilla de fragüe rápido.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["25kg", "10kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391768/j2eyjmexevt2jj1b81wj.jpg", variantImgs: {"25kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391771/qd1idej0notamaj0ohs1.jpg", "10kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391772/yiyjopwwykypf3vvkem8.jpg"} },
    { id: "dur_lana_vidrio", name: "Lana de Vidrio Premium", desc: "Aislante térmico y acústico con foil de aluminio.", category: "Aislantes", provider: "Durlock", variants: ["50mm espesor", "70mm espesor"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391774/gyc4v5jxm4jbre1udtl1.jpg", variantImgs: {"50mm espesor": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391776/bashzcdfub4iyvkbgazp.jpg", "70mm espesor": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391778/dlkyoqjqzczyqizv3mnl.jpg"} },
    
    // AISPLAC - PVC
    { id: "ais_pvc_blanco", name: "PVC Blanco", desc: "Cielorraso de PVC Blanco (20cm ancho x 1cm espesor).", category: "PVC", provider: "Aisplac", variants: ["1.00m", "2.00m", "3.00m", "4.00m", "5.00m", "6.00m"], img: "1.png" },
    { id: "ais_pvc_color", name: "PVC Color", desc: "Cielorraso de PVC imitación madera.", category: "PVC", provider: "Aisplac", variants: ["Fresno", "Valencia", "Negro", "Roble (5.95m)", "Cedro (5.95m)"], img: "1.png" },
    { id: "ais_molduras", name: "Molduras PVC", desc: "Terminaciones U, N y H para cielorrasos PVC.", category: "Molduras", provider: "Aisplac", variants: ["U Blanca", "U Fresno", "U Negro", "N Blanca", "N Fresno", "H Blanca", "H Negro"], img: "1.png" },

    // JMA - Perfiles
    { id: "jma_montante", name: "Montante JMA", desc: "Perfil estructural de acero galvanizado.", category: "Perfiles", provider: "JMA", variants: ["34mm x 2.60m", "34mm x 4.00m", "69mm x 2.60m"], img: "1.png" },
    { id: "jma_solera", name: "Solera JMA", desc: "Perfil guía para tabiques.", category: "Perfiles", provider: "JMA", variants: ["35mm x 2.60m", "35mm x 4.00m", "70mm x 2.60m"], img: "1.png" },
    { id: "jma_perfiles_v", name: "Perfiles Varios JMA", desc: "Perfiles complementarios para construcción en seco.", category: "Perfiles", provider: "JMA", variants: ["Omega", "Buña Z", "Cantonera", "Ángulo Ajuste"], img: "1.png" },
    // ATENNEAS
    { id: "ate_molduras", name: "Molduras Atenneas", desc: "Molduras decorativas de poliuretano (2.00mts).", category: "Molduras", provider: "Atenneas", variants: ["AT-31R", "AT-35", "AT-40", "AT-46", "AT-49", "AT-52", "AT-58", "AT-61R", "AT-70", "AT-76", "AT-85", "AT-90", "AT-91R", "AT-105"], img: "1.png" },
    { id: "ate_guardas", name: "Guardas Atenneas", desc: "Guardas decorativas coordinadas.", category: "Guardas", provider: "Atenneas", variants: ["AT-04", "AT-05", "AT-06", "AT-06S", "AT-07"], img: "1.png" },
    { id: "ate_muropanel", name: "Muropanel Nude", desc: "Revestimiento de pared texturado.", category: "Revestimientos", provider: "Atenneas", variants: ["PRAGA", "TERRARUM", "FINLANDÉS", "CAJÚ"], img: "1.png" },
    { id: "ate_adhesivos", name: "Adhesivos Atenneas", desc: "Pegamento especial para poliuretano.", category: "Adhesivos", provider: "Atenneas", variants: ["Cartucho 400gr", "Pote 1.5kg", "Balde 5kg"], img: "1.png" },

    // MAROPOR
    { id: "mar_masilla_lpu", name: "Masilla LPU Maropor", desc: "Masilla lista para usar.", category: "Masilla", provider: "Maropor", variants: ["Doypack 2kg", "Balde 7kg", "Balde 16kg", "Balde 32kg"], img: "1.png" },
    { id: "mar_masilla_duo", name: "Masilla Duo Maropor", desc: "Masilla de fragüe para juntas.", category: "Masilla", provider: "Maropor", variants: ["1.7kg", "7kg", "16kg", "32kg"], img: "1.png" },
    { id: "mar_masilla_ext", name: "Masilla Exterior Maropor", desc: "Masilla reforzada para exteriores.", category: "Masilla", provider: "Maropor", variants: ["1.5kg", "6kg", "15kg", "30kg"], img: "1.png" },
    { id: "mar_adhesivo_moldura", name: "Adhesivo Moldura Maropor", desc: "Pegamento para moldura interior.", category: "Adhesivos", provider: "Maropor", variants: ["Cartucho 450gr", "Doypack 1kg", "Pote 1kg", "Balde 7kg"], img: "1.png" },
    { id: "mar_adhesivo_zocalo", name: "Adhesivo Zócalo Maropor", desc: "Pegamento extra fuerte para zócalos.", category: "Adhesivos", provider: "Maropor", variants: ["Cartucho 450gr", "Pote 1.7kg", "Balde 7kg"], img: "1.png" },
    { id: "mar_molduras", name: "Molduras Maropor", desc: "Molduras decorativas de poliestireno (2.00mts).", category: "Molduras", provider: "Maropor", variants: ["M30", "M33", "M35", "M37", "M40", "M42", "M46", "M47", "M49", "M60", "M68", "M78", "MP1", "MP2", "MP3", "MP18"], img: "1.png" },
    { id: "mar_desmontables", name: "Perfiles Desmontables Maropor", desc: "Sistema de suspensión para cielorrasos.", category: "Perfiles", provider: "Maropor", variants: ["Larguero 3.66", "Travesaño 0.61", "Travesaño 1.22", "Perimetral 3.05"], img: "1.png" },

    // ACON
    { id: "aco_gargantas", name: "Gargantas ACON", desc: "Gargantas para iluminación LED perimetral.", category: "Iluminación", provider: "ACON", variants: ["GIL 1 (Pared/Techo)", "GIL 3 (Central)", "GIF 2 (Perimetral)", "GIM 1 (LED)", "CZI (Cortinero)"], img: "1.png" },

    // IPROA
    { id: "ipr_cortinas", name: "Cortinas IPROA", desc: "Sistemas de cortinería a medida.", category: "Cortinas", provider: "IPROA", variants: ["Roller", "Roller Doble", "Veneciana Alum.", "Veneciana Madera", "Bandas Vert.", "Parcelle", "Etienne"], img: "1.png" },

    // TELPLAST
    { id: "tel_pegamentos", name: "Pegamentos y Químicos TelPlast", desc: "Soluciones de adhesión para obra.", category: "Adhesivos", provider: "TelPlast", variants: ["Cola 1kg", "Cola 500gr", "Cola 250gr", "WOW 400gr Cartucho", "WOW 120gr Pomo", "Masilla Madera 1.7kg", "Masilla Madera 800gr", "Masilla Yeso 32kg", "Fijador 4Lt", "Sellador Grietas 400gr"], img: "1.png" },

    // CASETO
    { id: "cas_accesorios", name: "Accesorios Caseto", desc: "Perfilería y accesorios de terminación.", category: "Accesorios", provider: "Caseto", variants: ["Ángulo 320", "Ángulo 300", "Ángulo 301", "Ángulo 1012", "Fleje 321", "Fleje 324", "Media Caña 1020", "Perfil T1 - 309", "Perfil T2 - 310"], img: "1.png" },

    // OTROS PRODUCTOS - MADERAS
    { id: "mar_liston_cep", name: "Listón de Pino Cepillado", desc: "Listones de pino de alta calidad para carpintería y construcción.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1x1 x 3.05", "1x1 1/2 x 3.05", "1x2 (2.75m a 3.95m)", "2x2 x 3.05", "3x3 x 3.05"], img: "1.png" },
    { id: "mar_liston_sce", name: "Listón de Pino S/Cepillar", desc: "Listones en bruto para estructura y usos generales.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1x2 (2.75m a 3.95m)"], img: "1.png" },
    { id: "mar_tabla_pino", name: "Tabla de Pino S/Cepillar", desc: "Tablas de pino brutas en diversas medidas.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1x3 x 3.05", "1x4 x 3.05", "1x5 x 3.05", "1x6 x 3.05", "1x8 x 3.05", "1x10 x 3.05", "1x12 x 3.05"], img: "1.png" },
    { id: "mar_machimbre", name: "Machimbre de Pino", desc: "Tablas machiembradas para cielorrasos y revestimientos.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1/2\" (3.05m a 3.95m)", "3/4\" (x 3.05/3.65)", "1\" (x 3.05/3.65)"], img: "1.png" },
    { id: "mar_fenolico", name: "Placas Fenólicas", desc: "Tableros de pino compensados de gran resistencia.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["6mm - 1.22x2.44", "9mm - 1.22x2.44", "12mm - 1.22x2.44", "15mm - 1.22x2.44", "18mm - 1.22x2.44", "Industrial 15mm", "Industrial 18mm"], img: "1.png" },
    { id: "mar_osb", name: "Placas OSB", desc: "Tableros de virutas orientadas para usos estructurales.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["6mm", "9mm", "12mm", "15mm", "18mm"], img: "1.png" },
    { id: "mar_bastidor", name: "Bastidor de Pino", desc: "Estructura de pino x 3.00mts.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["3.00m"], img: "1.png" },

    // SIDING METÁLICO
    { id: "mar_siding_met", name: "Siding Metálico Premium", desc: "Revestimiento metálico texturado de alta durabilidad.", category: "Siding", provider: "Otros Productos", variants: ["Gris (LZG-701)", "Marrón Oscuro (LZG-A008)", "Marrón (LZG-A004)", "Marrón Claro (LZG-A001)"], img: "1.png" },
    { id: "mar_siding_perfiles", name: "Perfiles para Siding Metálico", desc: "Accesorios de terminación para siding.", category: "Siding", provider: "Otros Productos", variants: ["Esq. Interior", "Esq. Exterior", "Perfil de Unión", "Inicio/Terminación"], img: "1.png" },

    // PLACAS UV
    { id: "mar_placa_uv_std", name: "Placas UV - 1.22 x 2.44", desc: "Placas decorativas con acabado simil mármol y piedras.", category: "Placas UV", provider: "Otros Productos", variants: ["Tundra", "Estepa", "Armani", "Statuario", "Wood", "Brick Grey", "Thassos Blanco", "Calacatta", "Marquina", "Crema Marfil", "Sierra Gris", "Carrara", "Crema Cenato", "Marfil Gris", "Calacatta Gold", "Calatorao", "Nilo", "Damero Blanco", "Carrara Italiano", "Zulo", "Patagonia", "Porfido Gris"], img: "1.png" },
    { id: "mar_placa_uv_xl", name: "Placa UV XL - 1.22 x 2.80", desc: "Formato extendido para grandes superficies.", category: "Placas UV", provider: "Otros Productos", variants: ["Marmara (2.80m)"], img: "1.png" },
    { id: "mar_adh_uv", name: "Adhesivo Placas UV", desc: "Pegamento específico para la correcta instalación de placas UV.", category: "Placas UV", provider: "Otros Productos", variants: ["Cartucho x 300ml"], img: "1.png" },

    // ZÓCALOS DE PVC
    { id: "mar_zocalo_tr", name: "Zócalo PVC Top Round", desc: "Zócalos curvos de alta resistencia y fácil limpieza.", category: "Zócalos", provider: "Otros Productos", variants: ["57mm x 2400 (TR57)", "75mm Blanco Polar", "75mm Negro Azabache", "75mm Roble/Gris/Plata", "100mm x 2400 (TR100)"], img: "1.png" },
    { id: "mar_zocalo_tl", name: "Zócalo PVC Top Line", desc: "Zócalos rectos modernos para ambientes minimalistas.", category: "Zócalos", provider: "Otros Productos", variants: ["75mm x 2400 (TL75)", "100mm x 2400 (TL100)", "120mm x 2400 (TL120)", "150mm x 2400 (TL150)"], img: "1.png" },
    { id: "mar_zocalo_especial", name: "Zócalos Especiales PVC", desc: "Modelos específicos para mayor cobertura o diseño.", category: "Zócalos", provider: "Otros Productos", variants: ["SX105 (108mm Alto)", "Cover Blanco (100mm)"], img: "1.png" },

    // PISOS FLOTANTES
    { id: "mar_piso_vinilico", name: "Piso Vinílico Click", desc: "Pisos de PVC de alta resistencia con sistema de encastre click.", category: "Pisos", provider: "Otros Productos", variants: ["Timberlux (Sandalwood/Oak)", "Stone (Mármol/Piedra)", "Harmony (Bisque/Amber/Silver)", "Lounge (Roble Brandy)", "Rustic (Fox/Millenium/Camel)", "Pinar (Helsinki/Bergen)", "Extreme (Toscana/Tivoli/Treviso)"], img: "1.png" },
    { id: "mar_piso_melaminico", name: "Piso Melamínico Click", desc: "Pisos flotantes de madera melamínica de alto tránsito.", category: "Pisos", provider: "Otros Productos", variants: ["Cerezo Historic D2838", "Roble Assago L8653", "Roble Rústico L8617", "Roble Strassburgo D8011", "Roble Rift D3044", "Roble Montreux D3783", "Roble New York D8014", "Roble Lugano D3180"], img: "1.png" },

    // DECKS Y REVESTIMIENTOS
    { id: "mar_deck_composite", name: "Deck de Composite", desc: "Tablas para exterior sin mantenimiento, imitación madera.", category: "Deck", provider: "Otros Productos", variants: ["Línea C (D02, D11, D12, D06...)", "Línea B (Charcoal, Ipe, Teak, Antique)"], img: "1.png" },
    { id: "mar_wall_panel_ext", name: "Wall Panel Exterior", desc: "Paneles de exterior resistentes a la intemperie.", category: "Wall Panel", provider: "Otros Productos", variants: ["Light Grey", "Ipe", "Charcoal", "Teak", "Antique", "Oak", "Silver Grey"], img: "1.png" },
    { id: "mar_rev_acustico", name: "Revestimiento Acústico", desc: "Paneles ranurados para tratamiento acústico y diseño.", category: "Revestimientos", provider: "Otros Productos", variants: ["Fresno", "Nogal", "Jatoba"], img: "1.png" },
    { id: "mar_rev_interior", name: "Revestimiento de Pared Interior", desc: "Lamas decorativas para interiores modernos.", category: "Revestimientos", provider: "Otros Productos", variants: ["Panel Marfil/Gris/Roble/Incienso", "Perfiles de Inicio", "Perfiles de Terminación"], img: "1.png" },
    { id: "mar_decopanel", name: "Decopanel Revestimiento", desc: "Revestimientos texturados premium en diversas tramas.", category: "Revestimientos", provider: "Otros Productos", variants: ["Cotton", "Felt", "Silk", "Linen", "3D (Silk/Cotton/Felt)", "Accesorios (Unión, Term, Esq)"], img: "1.png" },

    // REVESTIMIENTOS FLAT, SHARP, CURLY, 3D
    { id: "mar_rev_flat", name: "Revestimiento Interior Flat", desc: "Lamas lisas para un acabado moderno y minimalista.", category: "Revestimientos", provider: "Otros Productos", variants: ["Panel (Negro/Gris/Crema)", "Perfil Inicio (Negro/Gris/Crema)", "Perfil Term (Negro/Gris/Crema)"], img: "1.png" },
    { id: "mar_rev_sharp", name: "Revestimiento Interior Sharp", desc: "Diseño con aristas marcadas para texturas profundas.", category: "Revestimientos", provider: "Otros Productos", variants: ["Ocean", "Nature", "Forest"], img: "1.png" },
    { id: "mar_rev_curly", name: "Revestimiento Interior Curly", desc: "Revestimiento con terminación curva elegante.", category: "Revestimientos", provider: "Otros Productos", variants: ["Dusty", "Root", "Ash"], img: "1.png" },
    { id: "mar_rev_flat_3d", name: "Revestimiento Flat 3D", desc: "Revestimientos con relieve tridimensional de alta gama.", category: "Revestimientos", provider: "Otros Productos", variants: ["Black Oak", "Oak", "Verde Aqua"], img: "1.png" },

    // ESPEJOS Y PISO EN ROLLO
    { id: "mar_espejos_led", name: "Espejo LED Premium", desc: "Espejos con iluminación LED integrada de diversos formatos.", category: "Espejos", provider: "Otros Productos", variants: ["K202 (600x800)", "HKM2011 (600x600)", "HKM 5008 (500x1400)"], img: "1.png" },
    { id: "mar_piso_rollo", name: "Piso Vinílico en Rollo", desc: "Pisos de PVC en rollo de fácil instalación y variados diseños.", category: "Pisos", provider: "Otros Productos", variants: ["JY007/061/6123 (0.5mm)", "12501/6631 (1.2mm)", "MW-4/1707/201-4 (1.2mm)"], img: "1.png" },

    // CÉSPED Y JARDÍN VERTICAL
    { id: "mar_cesped_sintetico", name: "Césped Sintético", desc: "Césped artificial de alta calidad para exteriores y deportes.", category: "Césped y Jardín", provider: "Otros Productos", variants: ["Soft / Soft Mega", "Invierno Azul Soft", "Sport Soft", "Otoño Largo Soft/Mega", "Otoño Corto"], img: "1.png" },
    { id: "mar_jardin_vertical", name: "Jardín Vertical Artificial", desc: "Paneles decorativos de follaje sintético para paredes.", category: "Césped y Jardín", provider: "Otros Productos", variants: ["Aruba/Brasil/Magnolia", "Verdelia/Verbena/Camelia", "Melissa/Mediterránea/Aralia", "Hiedra/Lavanda/Fotinia"], img: "1.png" },

    // TORNILLOS Y FIJACIONES
    { id: "mar_fijaciones", name: "Fijaciones y Tarugos", desc: "Sistemas de fijación para diversos tipos de muros.", category: "Tornillería", provider: "Otros Productos", variants: ["Fijación del 6 (S/Tope, C/Tope, Uni)", "Fijación del 8 (S/Tope, C/Tope, Uni)", "Taco Espiral para Yeso"], img: "1.png" },
    { id: "mar_tornillos_t", name: "Tornillos T1 a T5", desc: "Tornillería técnica para construcción en seco.", category: "Tornillería", provider: "Otros Productos", variants: ["T1 (P/M o P/A)", "T2 (P/M o P/A)", "T3 P/A", "T4 P/A", "T5 P/A"], img: "1.png" },

    // ACCESORIOS VARIOS Y QUÍMICOS
    { id: "mar_adhesivos_obra", name: "Adhesivos y Espumas de Obra", desc: "Cementos de contacto y espumas de poliuretano para fijación.", category: "Accesorios y Químicos", provider: "Otros Productos", variants: ["Cem. Contacto (1/4, 1/2, 1, 4 Lts)", "Espuma Poliuretano 300ml"], img: "1.png" },
    { id: "mar_cintas", name: "Cintas de Instalación", desc: "Cintas microperforadas y térmicas para juntas y terminaciones.", category: "Accesorios y Químicos", provider: "Otros Productos", variants: ["Microperforada (75/150m)", "Mesh (45/90m)"], img: "1.png" },
    { id: "mar_aislantes", name: "Aislantes y Mantas", desc: "Soluciones de aislamiento térmico y acústico para suelos y muros.", category: "Aislantes", provider: "Otros Productos", variants: ["Espuma FOAM 10mm (1x20)", "Sound Block 18m2", "Bajo Piso Niveladora", "Silent Steep 1mm (18.6m2)"], img: "1.png" },
    { id: "mar_eps", name: "EPS - Telgopor", desc: "Planchas de poliestireno expandido de diversos espesores.", category: "Aislantes", provider: "Otros Productos", variants: ["1cm", "1.5cm", "2cm", "2.5cm", "3cm"], img: "1.png" },
    { id: "mar_varios_obra", name: "Varios Obra", desc: "Complementos necesarios para finalización de obra.", category: "Accesorios", provider: "Otros Productos", variants: ["Puerta Plegada PVC (0.85/1.00m)", "Malla Fibra 90g/120g"], img: "1.png" }
];

// Select Variant logic
window.selectVariant = function(productId, variantName, element) {
    // UI Update: toggle chips
    const card = element.closest('.product-card');
    card.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    
    // Update Add Button data-variant
    const addBtn = document.getElementById(`add-btn-${productId}`);
    if (addBtn) {
        addBtn.setAttribute('data-variant', variantName);
    }

    // Update Image if Variant has a mapped image
    const p = productsData.find(x => x.id === productId);
    if (p) {
        const imgEl = card.querySelector('.product-img');
        if (imgEl) {
            if (p.variantImgs && p.variantImgs[variantName]) {
                imgEl.src = p.variantImgs[variantName];
                if (addBtn) addBtn.dataset.img = p.variantImgs[variantName];
            } else if (p.img) {
                // Fallback to main image if no variant image mapped
                imgEl.src = p.img;
                if (addBtn) addBtn.dataset.img = p.img;
            }
        }
    }
};

// Purge and Reset System (One-time usage for Admin to clear Firestore)
async function purgeAndResetCatalog() {
    if (!isAdminUser) return;
    if (!confirm("ADVERTENCIA: ¿Deseas borrar TODOS los productos actuales e importar la nueva lista oficial?")) return;
    
    try {
        console.log("Iniciando purga de catálogo...");
        const querySnapshot = await getDocs(collection(db, "products"));
        for (const docSnap of querySnapshot.docs) {
            await deleteDoc(doc(db, "products", docSnap.id));
        }
        
        console.log("Catalog purgado. Importando nuevos productos...");
        for (const p of defaultProducts) {
             await setDoc(doc(db, "products", p.id), p);
        }
        
        alert("Catálogo oficial importado con éxito. La página se recargará.");
        window.location.reload();
    } catch (error) {
        console.error("Error en la purga:", error);
        alert("Error al purgar el catálogo.");
    }
}
window.purgeAndResetCatalog = purgeAndResetCatalog;

// Load from Firestore
async function initializeProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const fbProducts = [];
        querySnapshot.forEach((doc) => {
            fbProducts.push({ id: doc.id, ...doc.data() });
        });
        
        // Fusión: Priorizar Firestore pero inyectar defaults faltantes
        const fbIds = new Set(fbProducts.map(p => p.id));
        const missingDefaults = defaultProducts.filter(p => !fbIds.has(p.id));
        productsData = [...fbProducts, ...missingDefaults];

        // Botón de sincronización para administradores
        if (isAdminUser) {
            const controls = document.querySelector('.catalog-controls');
            if (controls && !document.getElementById('btn-reset-catalog')) {
                const btn = document.createElement('button');
                btn.id = 'btn-reset-catalog';
                btn.className = 'btn btn-danger';
                btn.style.marginLeft = '1rem';
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Catálogo Oficial';
                btn.onclick = purgeAndResetCatalog;
                controls.appendChild(btn);
            }
        }

        // Aviso de catálogo antiguo o desactualizado
        const isLegacy = productsData.some(p => !p.variants || p.variants.length === 0);
        if (isLegacy && isAdminUser) {
            setTimeout(() => {
                alert(`AVISO: Hay ${missingDefaults.length} productos nuevos para sincronizar. Usa el botón rojo.`);
            }, 1000);
        }

        // Migración de imágenes antiguas
        if (isAdminUser) {
            for (const p of productsData) {
                if (p.img && (p.img.includes('proveedores/') || p.img.includes('picsum.photos'))) {
                    p.img = '1.png';
                    await saveProduct(p);
                }
            }
        }
    } catch (error) {
        console.error("Error loading products:", error);
        if (productsData.length === 0) {
            productsData = [...defaultProducts];
        }
    } finally {
        renderFilters();
        renderProducts();
    }
}

async function saveProduct(product) {
    try {
        await setDoc(doc(db, "products", String(product.id)), product);
    } catch (e) {
        console.error("Error saving product: ", e);
        throw e;
    }
}

// Function to render products
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const stats = document.getElementById('stats-info');
    grid.innerHTML = '';

    // Apply Filters
    let filtered = productsData;

    // 1. Text Search
    if (currentSearch.trim() !== '') {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.desc.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            p.provider.toLowerCase().includes(term)
        );
    }

    // 2. Categories Filter
    if (selectedCategories.size > 0) {
        filtered = filtered.filter(p => selectedCategories.has(p.category));
    }

    // 3. Providers Filter
    if (selectedProviders.size > 0) {
        filtered = filtered.filter(p => selectedProviders.has(p.provider));
    }

    // 4. Colors Filter
    if (selectedColors.size > 0) {
        filtered = filtered.filter(p => selectedColors.has(p.color));
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, end);

    // Render
    if (paginated.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem; padding: 2rem;">No se encontraron productos en el catálogo que coincidan con la búsqueda.</p>';
    } else {
        paginated.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card glass reveal delay-2';
            card.innerHTML = `
                <a href="producto-detalle.html?id=${p.id}" class="product-link" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1;">
                    <div style="position: relative; overflow: hidden; height: 200px; background: #ffffff; display: flex; align-items: center; justify-content: center;">
                         <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                         <div class="product-hover-overlay">
                            <span class="btn btn-secondary">Ver detalles</span>
                         </div>
                    </div>
                    <div class="product-info" style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                        <span class="product-provider-badge">${p.provider}</span>
                        <h3 class="product-title" style="margin: 0.5rem 0; font-size: 1.1rem;">${p.name}</h3>
                        <p class="product-desc" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; flex: 1;">${p.desc}</p>
                        
                        <!-- Variant Selector -->
                        ${p.variants && p.variants.length > 0 ? `
                        <div class="variant-selector" onclick="event.preventDefault(); event.stopPropagation();">
                            <label style="font-size: 0.8rem; color: var(--accent-color); margin-bottom: 0.4rem; display: block;">Seleccionar ${p.category.includes('PVC') || p.category.includes('Moldura') ? 'Medida/Color' : 'Medida'}:</label>
                            <div class="variant-chips">
                                ${p.variants.map((v, idx) => `
                                    <button class="variant-chip ${idx === 0 ? 'active' : ''}" 
                                            onclick="selectVariant('${p.id}', '${v}', this)">
                                        ${v}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
                            <span style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid var(--glass-border);">${p.color || p.category}</span>
                        </div>
                    </div>
                </a>
                
                ${!isAdminUser ? `
                <div style="padding: 0 1.5rem 1.5rem 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem;">
                        <button class="catalog-qty-btn" data-id="${p.id}" data-delta="-1">−</button>
                        <span class="catalog-qty-display" data-id="${p.id}">1</span>
                        <button class="catalog-qty-btn" data-id="${p.id}" data-delta="1">+</button>
                        <button class="btn btn-secondary catalog-add-btn" 
                                id="add-btn-${p.id}"
                                data-id="${p.id}" 
                                data-name="${p.name.replace(/"/g, '&quot;')}" 
                                data-img="${p.img}" 
                                data-cat="${p.category}"
                                data-variant="${p.variants && p.variants.length > 0 ? p.variants[0] : ''}">
                            <i class="fas fa-cart-plus"></i> Agregar
                        </button>
                    </div>
                </div>
                ` : ''}

                ${isAdminUser ? `
                <div class="admin-controls" style="display: flex; gap: 0.5rem; padding: 0 1.5rem 1.5rem 1.5rem;">
                    <button class="btn btn-secondary" onclick="event.preventDefault(); editProduct('${p.id}')" style="flex: 1; padding: 0.5rem;">
                       <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="event.preventDefault(); deleteProduct('${p.id}')" style="flex: 1; padding: 0.5rem;">
                       <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    stats.innerText = `Mostrando ${paginated.length} de ${filtered.length} productos (Página ${currentPage} de ${totalPages || 1})`;
    renderPagination(totalPages);

    // Re-initialize animations for new elements
    if (typeof window.initAnimations === 'function') {
        setTimeout(window.initAnimations, 50);
    }
    // Reset qty displays to match cardQtyMap (which persists across renders)
    cardQtyMap.forEach((qty, id) => {
        grid.querySelectorAll(`.catalog-qty-display[data-id="${id}"]`).forEach(el => {
            el.textContent = qty;
        });
    });
}

function renderPagination(totalPages) {
    const controls = document.getElementById('pagination-controls');
    controls.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev Button
    const prev = document.createElement('button');
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; renderProducts(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    controls.appendChild(prev);

    // Page indicator
    const indicator = document.createElement('span');
    indicator.style.color = 'var(--text-secondary)';
    indicator.innerText = `${currentPage} / ${totalPages}`;
    controls.appendChild(indicator);

    // Next Button
    const next = document.createElement('button');
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; renderProducts(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    controls.appendChild(next);
}

// Admin Functions
window.editProduct = window.editProduct || async function (id) {
    const p = productsData.find(x => x.id === id);
    if (!p) return;

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-category').value = p.category || '';
    document.getElementById('p-provider').value = p.provider || '';
    document.getElementById('p-color').value = p.color || '';
    document.getElementById('p-size').value = p.variants ? p.variants.join(', ') : (p.size || '');
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('p-img').value = p.img || '';

    // If we have an image field wrapper, change it to show it's a file or URL
    // (We also need to adapt the HTML to allow file upload)

    document.getElementById('modal-product-title').innerText = 'Editar Producto';
    document.getElementById('addModal').style.display = 'flex';
}

window.deleteProduct = window.deleteProduct || async function (id) {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
        const p = productsData.find(x => x.id === id);
        if(p) {
            try {
                await deleteDoc(doc(db, "products", String(id)));
                productsData = productsData.filter(x => x.id !== id);
                renderProducts();
                renderFilters();
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Hubo un error al eliminar.");
            }
        }
    }
}

// Render dynamic filters based on current productsData
function renderFilters() {
    const catsContainer = document.getElementById('filter-categories');
    const provsContainer = document.getElementById('filter-providers');
    const colorsContainer = document.getElementById('filter-colors');

    if (!catsContainer || !provsContainer || !colorsContainer) return; // Exit if not in catalog page

    // Get unique sorted lists
    const uniqueCats = [...new Set(productsData.map(p => p.category))].sort();
    const uniqueProvs = [...new Set(productsData.map(p => p.provider))].sort();
    const uniqueColors = [...new Set(productsData.map(p => p.color))].sort();

    // Helper to generate checkboxes
    const generateCheckboxes = (container, items, selectedSet, filterType) => {
        container.innerHTML = '';
        items.forEach(item => {
            const label = document.createElement('label');
            label.className = 'filter-checkbox';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.cursor = 'pointer';
            label.style.marginBottom = '0.4rem';
            label.style.fontSize = '0.95rem';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            checkbox.checked = selectedSet.has(item);

            // Update filter on change
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedSet.add(item);
                } else {
                    selectedSet.delete(item);
                }
                currentPage = 1;
                renderProducts();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item));
            container.appendChild(label);
        });
    };

    generateCheckboxes(catsContainer, uniqueCats, selectedCategories, 'category');
    generateCheckboxes(provsContainer, uniqueProvs, selectedProviders, 'provider');
    generateCheckboxes(colorsContainer, uniqueColors, selectedColors, 'color');

    // Also update horizontal dropdowns
    const hCats = document.getElementById('h-filter-categories');
    const hProvs = document.getElementById('h-filter-providers');
    
    if (hCats && hProvs) {
        // Categories Dropdown
        hCats.innerHTML = '<div class="dropdown-item" onclick="selectedCategories.clear(); currentPage=1; renderProducts(); renderFilters();">Todas las Categorías</div>';
        uniqueCats.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerText = cat;
            item.onclick = () => {
                selectedCategories.clear();
                selectedCategories.add(cat);
                currentPage = 1;
                renderProducts();
                renderFilters();
            };
            hCats.appendChild(item);
        });

        // Providers Dropdown
        hProvs.innerHTML = '<div class="dropdown-item" onclick="selectedProviders.clear(); currentPage=1; renderProducts(); renderFilters();">Todas las Marcas</div>';
        uniqueProvs.forEach(prov => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerText = prov;
            item.onclick = () => {
                selectedProviders.clear();
                selectedProviders.add(prov);
                currentPage = 1;
                renderProducts();
                renderFilters();
            };
            hProvs.appendChild(item);
        });
    }
}

// Clear all filters
function clearFilters() {
    selectedCategories.clear();
    selectedProviders.clear();
    selectedColors.clear();
    document.getElementById('search-input').value = '';
    currentSearch = '';
    currentPage = 1;
    renderFilters(); // Reset visual checkboxes
    renderProducts();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    renderFilters();
    renderProducts();

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const btnAdd = document.getElementById('btn-add-product');
    const modal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('close-modal');
    const addForm = document.getElementById('add-product-form');

    // Admin display
    if (isAdminUser && btnAdd) {
        btnAdd.style.display = 'inline-block';
    }

    // Search
    let timeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            renderProducts();
        }, 300); // 300ms debounce
    });

    // Modal behavior
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            document.getElementById('p-id').value = '';
            document.getElementById('modal-product-title').innerText = 'Añadir Nuevo Producto';
            if (addForm) addForm.reset();
            modal.style.display = 'flex';
        });
        btnCloseModal.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Clear filters behavior
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', clearFilters);
    }

    // ── Catalog qty/add event delegation (registered ONCE here) ──
    const catalogGrid = document.getElementById('products-grid');
    if (catalogGrid) {
        catalogGrid.addEventListener('click', function(e) {
            // Qty +/-
            const qtyBtn = e.target.closest('.catalog-qty-btn');
            if (qtyBtn) {
                e.preventDefault();
                const id = qtyBtn.dataset.id;
                const delta = parseInt(qtyBtn.dataset.delta, 10);
                let current = cardQtyMap.get(id) || 1;
                current = Math.max(1, current + delta);
                cardQtyMap.set(id, current);
                catalogGrid.querySelectorAll(`.catalog-qty-display[data-id="${id}"]`).forEach(el => {
                    el.textContent = current;
                });
                return;
            }
            // Add to cart
            const addBtn = e.target.closest('.catalog-add-btn');
            if (addBtn) {
                e.preventDefault();
                const id = addBtn.dataset.id;
                const name = addBtn.dataset.name;
                const img = addBtn.dataset.img;
                const cat = addBtn.dataset.cat;
                const variant = addBtn.dataset.variant || ''; // Extraer variante seleccionada
                const qty = cardQtyMap.get(id) || 1;
                
                window.addToCart(id, name, img, cat, qty, variant);
                // Reset display after adding
                cardQtyMap.set(id, 1);
                catalogGrid.querySelectorAll(`.catalog-qty-display[data-id="${id}"]`).forEach(el => {
                    el.textContent = '1';
                });
            }
        });
    }

    // Add/Edit Product
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = addForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Guardando...';

            try {
                const editId = document.getElementById('p-id').value;
                const name = document.getElementById('p-name').value;
                const category = document.getElementById('p-category').value;
                const provider = document.getElementById('p-provider').value;
                const color = document.getElementById('p-color').value;
                const size = document.getElementById('p-size').value;
                const desc = document.getElementById('p-desc').value;
                
                // Allow file upload or URL
                const imgFileInput = document.getElementById('p-img-file');
                let img = document.getElementById('p-img').value; 

                // Process image upload if a file is selected
                if (imgFileInput && imgFileInput.files.length > 0) {
                    const file = imgFileInput.files[0];
                    btnSubmit.innerText = `Subiendo imagen...`;
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', CLOUDINARY_PRESET);

                    const response = await fetch(CLOUDINARY_URL, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error("Error al subir imagen a Cloudinary");
                    
                    const data = await response.json();
                    img = data.secure_url;
                } else if (!img) {
                    img = `1.png`;
                }

                if (editId) {
                    // Edit existing
                    const idx = productsData.findIndex(p => p.id == editId);
                    if (idx !== -1) {
                        productsData[idx].name = name;
                        productsData[idx].category = category;
                        productsData[idx].provider = provider;
                        productsData[idx].color = color;
                        productsData[idx].variants = variants;
                        productsData[idx].desc = desc;
                        productsData[idx].img = img;
                        await saveProduct(productsData[idx]);
                    }
                } else {
                    // Add new
                    const newId = 'p_' + Date.now();
                    const newObj = {
                        id: newId,
                        name,
                        desc,
                        category: category,
                        provider: provider,
                        color: color,
                        variants: variants,
                        img: img || '1.png'
                    };
                    await saveProduct(newObj);
                    productsData.push(newObj);
                    currentPage = 1;
                }

                modal.style.display = 'none';
                addForm.reset();
                renderFilters();
                renderProducts();
                } catch(error) {
                    console.error("Error detallado al guardar producto: ", error);
                    alert("Error al guardar el producto: " + error.message);
                } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Guardar Producto';
                if(document.getElementById('p-img-file')) {
                    document.getElementById('p-img-file').value = '';
                }
            }
        });
    }
});
