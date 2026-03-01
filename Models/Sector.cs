using System.Text.Json.Serialization;

namespace CarrierCommand.Models;

public class Sector
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
    [JsonPropertyName("name")]
    public string Name { get; set; }
    [JsonPropertyName("x")]
    public double X { get; set; }
    [JsonPropertyName("y")]
    public double Y { get; set; }
    [JsonPropertyName("difficulty")]
    public int Difficulty { get; set; }
    [JsonPropertyName("isCleared")]
    public bool IsCleared { get; set; }
}

public class SectorStatus
{
    [JsonPropertyName("currentId")]
    public string CurrentId { get; set; }
    [JsonPropertyName("sectors")]
    public List<Sector> Sectors { get; set; } = new();
}
