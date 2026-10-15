using System;

// Script mejorado para calcular velocidad de la luz en diferentes medios
public class LightSpeedCalculatorPro
{
    // Constantes físicas
    private const double VELOCIDAD_VACIO = 299792458.0; // m/s
    
    // Índices de refracción comunes
    private static readonly Dictionary<string, double> IndicesRefraccion = new Dictionary<string, double>
    {
        {"vacio", 1.0},
        {"aire", 1.0003},
        {"agua", 1.333},
        {"vidrio", 1.5},
        {"diamante", 2.419},
        {"silicio", 3.47}
    };
    
    public static void Main()
    {
        Console.WriteLine("=== CALCULADORA DE VELOCIDAD DE LA LUZ ===");
        Console.WriteLine($"Velocidad en el vacío: {VELOCIDAD_VACIO:N0} m/s");
        Console.WriteLine();
        
        // Calcular para diferentes medios
        foreach (var medio in IndicesRefraccion)
        {
            double velocidad = VELOCIDAD_VACIO / medio.Value;
            Console.WriteLine($"En {medio.Key}: {velocidad:N0} m/s (índice: {medio.Value})");
        }
        
        Console.WriteLine();
        Console.WriteLine("=== DATOS INTERESANTES ===");
        Console.WriteLine($"La luz viaja a 300,000 km/s en el vacío");
        Console.WriteLine($"En el agua: {VELOCIDAD_VACIO / 1.333:N0} m/s");
        Console.WriteLine($"En el vidrio: {VELOCIDAD_VACIO / 1.5:N0} m/s");
    }
}