//css_ref System.Xml.Linq;
using System;
using System.Xml.Linq;
using System.Linq;

public class LightSpeedCalculator
{
    public static void Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        // Cargar el archivo de configuración
        string configPath = @"c:\PitayaCode\pitayacore\cs_scripts\config.xml";
        XDocument doc = XDocument.Load(configPath);
        
        // Buscar la sección del script (usamos el atributo "id" que es el correcto)
        var scriptSection = doc.Descendants("Script")
            .FirstOrDefault(x => x.Attribute("id")?.Value == "LightSpeedCalculator");
            
        if (scriptSection == null)
        {
            Console.WriteLine("No se encontró la configuración para LightSpeedCalculator");
            return;
        }
        
        // Obtener parámetros
        string medio = scriptSection.Element("medio")?.Value ?? "vacio";
        double? indiceRefraccion = null;
        var indiceElement = scriptSection.Element("indice_refraccion");
        if (indiceElement != null && double.TryParse(indiceElement.Value, out double idx))
        {
            indiceRefraccion = idx;
        }
        
        // Velocidad de la luz en el vacío (m/s)
        const double c = 299792458.0;
        
        double velocidad;
        string medioNombre = medio.ToLower();
        
        // Índices de refracción comunes
        if (indiceRefraccion.HasValue)
        {
            velocidad = c / indiceRefraccion.Value;
            Console.WriteLine($"Velocidad de la luz en medio con índice de refracción {indiceRefraccion.Value}: {velocidad} m/s");
        }
        else
        {
            switch (medioNombre)
            {
                case "vacio":
                case "vacío":
                    velocidad = c;
                    Console.WriteLine($"Velocidad de la luz en el vacío: {velocidad} m/s");
                    break;
                case "agua":
                    velocidad = c / 1.333; // ~225,000 km/s
                    Console.WriteLine($"Velocidad de la luz en el agua: {velocidad} m/s");
                    break;
                case "vidrio":
                    velocidad = c / 1.5; // ~200,000 km/s
                    Console.WriteLine($"Velocidad de la luz en el vidrio: {velocidad} m/s");
                    break;
                case "aire":
                    velocidad = c / 1.0003; // casi igual que en el vacío
                    Console.WriteLine($"Velocidad de la luz en el aire: {velocidad} m/s");
                    break;
                default:
                    Console.WriteLine($"Medio '{medio}' no reconocido. Usando vacío.");
                    velocidad = c;
                    Console.WriteLine($"Velocidad de la luz en el vacío: {velocidad} m/s");
                    break;
            }
        }
    }
}