using System;

class CalculadoraIMC
{
    static void Main()
    {
        // Datos del usuario
        double peso = 80.0; // kg
        double altura = 1.80; // m

        // Cálculo del IMC
        double imc = peso / (altura * altura);

        // Determinación de la categoría
        string categoria;
        if (imc < 18.5)
            categoria = "Bajo peso";
        else if (imc < 25)
            categoria = "Normal";
        else if (imc < 30)
            categoria = "Sobrepeso";
        else
            categoria = "Obesidad";

        // Mostrar resultados
        Console.WriteLine("=== Cálculo de IMC ===");
        Console.WriteLine($"Peso: {peso} kg");
        Console.WriteLine($"Altura: {altura} m");
        Console.WriteLine($"IMC: {imc:F2}");
        Console.WriteLine($"Categoría: {categoria}");
        Console.WriteLine("======================");
    }
}