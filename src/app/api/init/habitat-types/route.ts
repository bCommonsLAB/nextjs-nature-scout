import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';

// Aktualisierte Habitattypen mit typicalSpecies
const updatedHabitatTypes = [
  {
    name: 'Röhricht',
    description: 'Von Röhrichtpflanzen dominierte Flächen',
    typicalSpecies: [
      'Typha angustifolia (Schmalblättriger Rohrkolben)',
      'Schoenoplectus lacustris (Seebinse)',
      'Bolboschoenus maritimus (Gewöhnliche Strandsimse)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Auwald',
    description: 'Periodisch überflutete Waldgesellschaften',
    typicalSpecies: [
      'Alnus incana (Grauerle)',
      'Fraxinus excelsior (Gewöhnliche Esche)',
      'Salix alba (Silber-Weide)',
      'Populus nigra (Schwarz-Pappel)'
    ],
    habitatFamilie: 'Wald-Gehölz',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Quellbereich',
    description: 'Austrittsstellen von Grundwasser',
    typicalSpecies: [
      'Cardamine amara (Bitteres Schaumkraut)',
      'Chrysosplenium alternifolium (Wechselblättriges Milzkraut)',
      'Veronica beccabunga (Bachbunge)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Naturnaher Bachlauf',
    description: 'Natürlich mäandrierende Fließgewässer',
    typicalSpecies: [
      'Petasites hybridus (Gewöhnliche Pestwurz)',
      'Mentha aquatica (Wasserminze)',
      'Nasturtium officinale (Brunnenkresse)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Trockenrasen',
    description: 'Niedrigwüchsige Rasengesellschaften auf trockenen Standorten',
    typicalSpecies: [
      'Bromus erectus (Aufrechte Trespe)',
      'Festuca valesiaca (Walliser Schwingel)',
      'Artemisia campestris (Feld-Beifuß)',
      'Dianthus carthusianorum (Karthäuser-Nelke)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Magerwiese',
    description: 'Extensiv genutzte Wiesen auf nährstoffarmen Standorten',
    typicalSpecies: [
      'Briza media (Zittergras)',
      'Salvia pratensis (Wiesen-Salbei)',
      'Anthyllis vulneraria (Wundklee)',
      'Centaurea scabiosa (Skabiosen-Flockenblume)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'ökologisch hochwertig'
  },
  {
    name: 'Fettwiese',
    description: 'Intensiv genutzte Wiesen auf nährstoffreichen Standorten',
    typicalSpecies: [
      'Arrhenatherum elatius (Glatthafer)',
      'Trifolium pratense (Rot-Klee)',
      'Dactylis glomerata (Knaulgras)',
      'Taraxacum officinale (Löwenzahn)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'ökologisch niederwertig'
  },
  {
    name: 'Fettweide',
    description: 'Intensiv beweidete Flächen auf nährstoffreichen Standorten',
    typicalSpecies: [
      'Lolium perenne (Deutsches Weidelgras)',
      'Trifolium repens (Weiß-Klee)',
      'Cynosurus cristatus (Kammgras)',
      'Bellis perennis (Gänseblümchen)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'ökologisch niederwertig'
  },
  {
    name: 'Kunstrasen',
    description: 'Stark anthropogen beeinflusste Rasenflächen',
    typicalSpecies: [
      'Poa annua (Einjähriges Rispengras)',
      'Plantago major (Breit-Wegerich)',
      'Polygonum aviculare (Vogel-Knöterich)'
    ],
    habitatFamilie: 'Anthropogen',
    schutzstatus: 'ökologisch niederwertig'
  },
  {
    name: 'Schilf',
    description: 'Von Schilfrohr dominierte Flächen',
    typicalSpecies: [
      'Phragmites australis (Gemeines Schilfrohr)',
      'Phalaris arundinacea (Rohrglanzgras)',
      'Glyceria maxima (Wasserschwaden)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Magerweide',
    description: 'Extensiv beweidete Flächen auf nährstoffarmen Standorten',
    typicalSpecies: [
      'Nardus stricta (Borstgras)',
      'Thymus praecox (Früher Thymian)',
      'Potentilla erecta (Blutwurz)',
      'Carlina acaulis (Silberdistel)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'ökologisch hochwertig'
  },
  {
    name: 'Ruderalfläche',
    description: 'Gestörte Standorte mit spontaner Vegetation',
    typicalSpecies: [
      'Artemisia vulgaris (Gemeiner Beifuß)',
      'Urtica dioica (Große Brennnessel)',
      'Chenopodium album (Weißer Gänsefuß)',
      'Cirsium arvense (Acker-Kratzdistel)'
    ],
    habitatFamilie: 'Anthropogen',
    schutzstatus: 'ökologisch niederwertig'
  },
  {
    name: 'Verlandungsbereich',
    description: 'Übergangsbereich zwischen Gewässer und Land.',
    typicalSpecies: [
      'Typha latifolia (Breitblättriger Rohrkolben)',
      'Iris pseudacorus (Gelbe Schwertlilie)',
      'Lythrum salicaria (Blutweiderich)',
      'Myosotis palustris (Sumpf-Vergissmeinnicht)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Sumpfwald',
    description: 'Dauerhaft nasse Waldgesellschaften',
    typicalSpecies: [
      'Alnus glutinosa (Schwarzerle)',
      'Salix cinerea (Grau-Weide)',
      'Frangula alnus (Faulbaum)',
      'Caltha palustris (Sumpfdotterblume)'
    ],
    habitatFamilie: 'Wald-Gehölz',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Bruchwald',
    description: 'Waldgesellschaften auf nassem, nährstoffreichem Boden',
    typicalSpecies: [
      'Betula pubescens (Moor-Birke)',
      'Carex elongata (Walzen-Segge)',
      'Dryopteris carthusiana (Dorniger Wurmfarn)'
    ],
    habitatFamilie: 'Wald-Gehölz',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Wassergraben',
    description: 'Künstliche Wasserführungen',
    typicalSpecies: [
      'Berula erecta (Aufrechter Merk)',
      'Veronica anagallis-aquatica (Gauchheil-Ehrenpreis)',
      'Glyceria fluitans (Flutender Schwaden)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Felsensteppe',
    description: 'Steppenartige Vegetation auf felsigem Untergrund',
    typicalSpecies: [
      'Stipa pennata (Federgras)',
      'Bothriochloa ischaemum (Bartgras)',
      'Festuca rupicola (Felsen-Schwingel)',
      'Astragalus onobrychis (Esparsetten-Tragant)',
      'Achillea tomentosa (Filzige Schafgarbe)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Großsegge',
    description: 'Von großen Seggenarten dominierte Flächen',
    typicalSpecies: [
      'Carex elata (Steife Segge)',
      'Carex acutiformis (Sumpf-Segge)',
      'Carex riparia (Ufer-Segge)',
      'Carex paniculata (Rispen-Segge)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Moor',
    description: 'Torfbildende Feuchtgebiete',
    typicalSpecies: [
      'Sphagnum sp. (Torfmoose)',
      'Drosera rotundifolia (Rundblättriger Sonnentau)',
      'Eriophorum vaginatum (Scheidiges Wollgras)',
      'Vaccinium oxycoccos (Moosbeere)'
    ],
    habitatFamilie: 'Wassernah',
    schutzstatus: 'gesetzlich geschützt'
  },
  {
    name: 'Parkanlage',
    description: 'Gestaltete Grünflächen mit Gehölzen',
    typicalSpecies: [
      'Acer pseudoplatanus (Berg-Ahorn)',
      'Tilia cordata (Winter-Linde)',
      'Poa pratensis (Wiesen-Rispengras)',
      'Hedera helix (Efeu)'
    ],
    habitatFamilie: 'Anthropogen',
    schutzstatus: 'ökologisch niederwertig'
  },
  {
    name: 'alpines Grasland',
    description: 'Hochgelegene Graslandschaft über der Waldgrenze mit alpiner Vegetation',
    typicalSpecies: [
      'Achillea moschata (Moschus-Schafgarbe)',
      'Sempervivum bryoides (Zwerg-Hauswurz)',
      'Agrostis agrostiflora (Zartes Straußgras)',
      'Persicaria vivipara (Knöllchen-Knöterich)',
      'Anthyllis vulneraria subsp. alpicola (Alpen-Wundklee)',
      'Achillea clavennae (Bittere Schafgarbe)',
      'Pedicularis verticillata (Quirlblättriges Läusekraut)',
      'Gentiana verna (Frühlings-Enzian)',
      'Carex firma (Polster-Segge)',
      'Hieracium villosum (Zottiges Habichtskraut)',
      'Biscutella laevigata (Brillenschötchen)',
      'Dryas octopetala (Silberwurz)',
      'Carex curvula (Krumm-Segge)',
      'Leontodon helveticus (Schweizer Löwenzahn)',
      'Geum montanum (Berg-Nelkenwurz)',
      'Hieracium alpinum (Alpen-Habichtskraut)',
      'Trifolium alpinum (Alpen-Klee)',
      'Nardus stricta (Borstgras)',
      'Arnica montana (Arnika)',
      'Calluna vulgaris (Heidekraut)',
      'Campanula barbata (Bärtige Glockenblume)',
      'Gentianella rhaetica (Rätischer Enzian)',
      'Gentiana acaulis (Kalk-Glocken-Enzian)'
    ],
    habitatFamilie: 'Grasland-Wiesen',
    schutzstatus: 'ökologisch hochwertig'
  }
];

export async function GET() {
  try {
    // TEMPORÄR: Demo-Admin für Init-Routen
    const userId = 'demo-user-123';
    
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Nicht autorisiert' },
    //     { status: 401 }
    //   );
    // }
    
    // TEMPORÄR: Demo-Admin-Zugang
    const isAdmin = true;
    
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Nur Administratoren können Habitattypen initialisieren' },
    //     { status: 403 }
    //   );
    // }
    
    const db = await connectToDatabase();
    const collection = db.collection('habitatTypes');
    
    // Prüfen, ob bereits Daten vorhanden sind
    const existingCount = await collection.countDocuments();
    
    if (existingCount > 0) {
      // Update bestehender Einträge, einschließlich der neuen Felder
      const bulkOps = updatedHabitatTypes.map(habitat => ({
        updateOne: {
          filter: { name: habitat.name },
          update: { 
            $set: { 
              description: habitat.description,
              typicalSpecies: habitat.typicalSpecies,
              habitatFamilie: habitat.habitatFamilie,
              schutzstatus: habitat.schutzstatus
            },
            $unset: { category: "" } // Entferne das category-Feld
          },
          upsert: true
        }
      }));
      
      await collection.bulkWrite(bulkOps);
      
      return NextResponse.json({
        success: true,
        message: `${bulkOps.length} Habitattypen wurden aktualisiert.`
      });
    } else {
      // Neue Einträge erstellen
      await collection.insertMany(updatedHabitatTypes);
      
      return NextResponse.json({
        success: true,
        message: `${updatedHabitatTypes.length} Habitattypen wurden initialisiert.`
      });
    }
  } catch (error) {
    console.error('Fehler beim Initialisieren der Habitattypen:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
} 